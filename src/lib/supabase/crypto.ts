import { createClient } from './server';
import type {
  CryptoAsset,
  CryptoTransaction,
  CryptoDefiPosition,
  CryptoMonthlyPlan,
} from '@/types/crypto';

// Cliente tipado compartido — el tipado <Database> elimina los `as any` históricos
const getClient = createClient;

export async function getCryptoAssets(userId: string): Promise<CryptoAsset[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_assets')
    .select('id, user_id, symbol, name, coingecko_id, wallet_address, wallet_type, network, current_balance, avg_buy_price_eur, total_invested_eur, current_price_eur, price_updated_at, is_active, notes, color, sort_order, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order');
  return (data ?? []) as unknown as CryptoAsset[];
}

export async function getCryptoTransactions(userId: string): Promise<CryptoTransaction[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_transactions')
    .select('id, user_id, asset_id, transaction_date, type, quantity, price_eur, amount_eur, fee_eur, exchange, tx_hash, notes, source, external_id, created_at')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: true });
  return (data ?? []) as unknown as CryptoTransaction[];
}

export async function getCryptoDefiPositions(userId: string): Promise<CryptoDefiPosition[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_defi_positions')
    .select('id, user_id, asset_id, protocol, network, wallet_address, deposited_amount, current_amount, apy, yield_earned, last_updated, is_active, created_at')
    .eq('user_id', userId)
    .eq('is_active', true);
  return (data ?? []) as unknown as CryptoDefiPosition[];
}

export async function getCryptoMonthlyPlan(userId: string): Promise<CryptoMonthlyPlan[]> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_monthly_plan')
    .select('id, user_id, asset_id, monthly_amount_eur, destination, is_active, started_at, notes')
    .eq('user_id', userId)
    .eq('is_active', true);
  return (data ?? []) as unknown as CryptoMonthlyPlan[];
}

export async function addCryptoTransaction(
  userId: string,
  tx: Omit<CryptoTransaction, 'id' | 'user_id' | 'created_at'>
): Promise<CryptoTransaction | null> {
  const supabase = await getClient();
  const { data } = await supabase
    .from('crypto_transactions')
    .insert({ ...tx, user_id: userId })
    .select('id, user_id, asset_id, transaction_date, type, quantity, price_eur, amount_eur, fee_eur, exchange, tx_hash, notes, source, external_id, created_at')
    .maybeSingle();

  if (data) {
    await recalculateCryptoAssetTotals(userId, tx.asset_id ?? undefined);
  }

  return data as unknown as CryptoTransaction | null;
}

// Recalcula total_invested_eur y avg_buy_price_eur desde crypto_transactions.
// Si assetId se omite, recalcula todos los activos del usuario.
export async function recalculateCryptoAssetTotals(
  userId: string,
  assetId?: string
): Promise<void> {
  const supabase = await getClient();

  let query = supabase.from('crypto_transactions')
    .select('asset_id, amount_eur, quantity')
    .eq('user_id', userId)
    .eq('type', 'buy');

  if (assetId) query = query.eq('asset_id', assetId);

  const { data: txs } = await query;
  if (!txs || txs.length === 0) return;

  const byAsset = new Map<string, { invested: number; qty: number }>();
  for (const tx of txs as { asset_id: string; amount_eur: number; quantity: number }[]) {
    const cur = byAsset.get(tx.asset_id) ?? { invested: 0, qty: 0 };
    byAsset.set(tx.asset_id, {
      invested: cur.invested + (tx.amount_eur ?? 0),
      qty: cur.qty + (tx.quantity ?? 0),
    });
  }

  for (const [aid, { invested, qty }] of byAsset) {
    await supabase.from('crypto_assets')
      .update({
        total_invested_eur: invested,
        avg_buy_price_eur: qty > 0 ? invested / qty : null,
      })
      .eq('id', aid)
      .eq('user_id', userId);
  }
}

export async function updateCryptoAssetBalance(
  userId: string,
  symbol: string,
  balance: number
): Promise<void> {
  const supabase = await getClient();
  await supabase
    .from('crypto_assets')
    .update({ current_balance: balance })
    .eq('user_id', userId)
    .eq('symbol', symbol);
}
