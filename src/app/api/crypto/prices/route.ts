import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { getCoinGeckoPrices } from '@/lib/crypto/coingecko';
import { getBTCBalance, getETHBalance, getUSDCBalance } from '@/lib/crypto/blockchain';
import { getAaveUSDCPosition } from '@/lib/crypto/aave';
import { recalculateCryptoAssetTotals } from '@/lib/supabase/crypto';
import type { CoinGeckoPrices } from '@/lib/crypto/coingecko';
import type { AavePosition } from '@/lib/crypto/aave';

const BTC_ADDRESS = 'bc1YOUR_BTC_ADDRESS';
const ETH_ADDRESS = '0xYOUR_ETH_ADDRESS';
const USDC_ADDRESS = '0xYOUR_WALLET_ADDRESS';

const COINGECKO_ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  'usd-coin': 'USDC',
};

interface Balances {
  BTC: number | null;
  ETH: number | null;
  USDC: number | null;
}

interface CryptoPricesResponse {
  prices: CoinGeckoPrices | null;
  balances: Balances;
  aave: AavePosition | null;
  updatedAt: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  const { success } = await rateLimit(req, { limit: 20, window: 3600 });
  if (!success) {
    return Response.json({ error: 'Demasiadas peticiones. Espera un momento.' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [prices, btcBalance, ethBalance, usdcBalance, aavePosition] = await Promise.all([
    getCoinGeckoPrices(),
    getBTCBalance(BTC_ADDRESS),
    getETHBalance(ETH_ADDRESS),
    getUSDCBalance(USDC_ADDRESS),
    getAaveUSDCPosition(USDC_ADDRESS),
  ]);

  const updatedAt = new Date().toISOString();

  // Update prices from CoinGecko
  if (prices !== null) {
    for (const [cgId, symbol] of Object.entries(COINGECKO_ID_TO_SYMBOL)) {
      const priceData = prices[cgId];
      if (!priceData) continue;
      await supabase
        .from('crypto_assets')
        .update({
          current_price_eur: priceData.eur,
          price_updated_at: updatedAt,
        })
        .eq('user_id', user.id)
        .eq('symbol', symbol);
    }
  }

  // USDC total = aUSDC (in Aave) + regular USDC in wallet
  const aUSDCAmount = aavePosition?.currentAmount ?? null;
  const usdcTotalBalance =
    aUSDCAmount !== null || usdcBalance !== null
      ? (aUSDCAmount ?? 0) + (usdcBalance ?? 0)
      : null;

  // Update on-chain balances
  const onChainBalances: Array<[string, number | null]> = [
    ['BTC', btcBalance],
    ['ETH', ethBalance],
    ['USDC', usdcTotalBalance],
  ];

  for (const [symbol, balance] of onChainBalances) {
    if (balance === null) continue;
    await supabase
      .from('crypto_assets')
      .update({ current_balance: balance, price_updated_at: updatedAt })
      .eq('user_id', user.id)
      .eq('symbol', symbol);
  }

  // Update Aave position: current_amount + yield_earned + apy
  if (aavePosition?.currentAmount != null) {
    // Read deposited_amount from DB to compute yield
    const { data: defiRow } = await supabase
      .from('crypto_defi_positions')
      .select('deposited_amount')
      .eq('user_id', user.id)
      .eq('protocol', 'aave')
      .single();

    const depositedAmount =
      (defiRow as { deposited_amount: number | null } | null)?.deposited_amount ?? 0;
    const yieldEarned = Math.max(0, aavePosition.currentAmount - depositedAmount);

    await supabase
      .from('crypto_defi_positions')
      .update({
        current_amount: aavePosition.currentAmount,
        yield_earned: yieldEarned,
        apy: aavePosition.apy,
        last_updated: updatedAt,
      })
      .eq('user_id', user.id)
      .eq('protocol', 'aave');

    console.warn(
      `[aave] Updated: current=${aavePosition.currentAmount.toFixed(4)} deposited=${depositedAmount} yield=${yieldEarned.toFixed(4)} apy=${aavePosition.apy?.toFixed(2)}%`,
    );
  } else if (aavePosition?.apy != null) {
    // At minimum update APY even if balance fetch failed
    await supabase
      .from('crypto_defi_positions')
      .update({ apy: aavePosition.apy, last_updated: updatedAt })
      .eq('user_id', user.id)
      .eq('protocol', 'aave');
  }

  // Recalculate total_invested_eur / avg_buy_price_eur from transactions
  // so manual purchases added since the last sync are reflected immediately
  await recalculateCryptoAssetTotals(user.id);

  const body: CryptoPricesResponse = {
    prices,
    balances: { BTC: btcBalance, ETH: ethBalance, USDC: usdcBalance },
    aave: aavePosition,
    updatedAt,
  };

  return Response.json(body);
}
