import { getAaveUSDCBalance } from './blockchain';

export interface AavePosition {
  depositedAmount: number | null;
  currentAmount: number | null;
  apy: number | null;
  yieldEarned: number | null;
  version: 'v2' | 'v3' | null;
}

interface AaveReserve {
  symbol: string;
  liquidityRate: string;
  [key: string]: unknown;
}

async function fetchAaveAPY(version: 'v2' | 'v3'): Promise<number | null> {
  const poolId =
    version === 'v3'
      ? '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' // Aave V3 Ethereum
      : '0xb53c1a33016b2dc2ff3653530bff1848a515c8c5'; // Aave V2 Ethereum

  const url =
    version === 'v3'
      ? `https://aave-api-v3.aave.com/data/liquidity/v3?poolId=${poolId}`
      : `https://aave-api-v2.aave.com/data/liquidity/v2?poolId=${poolId}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as unknown;
    const reserves = Array.isArray(data)
      ? (data as AaveReserve[])
      : ((data as { reserves?: AaveReserve[] }).reserves ?? []);

    const usdcReserve = reserves.find((r) => r.symbol === 'USDC');
    if (!usdcReserve) return null;

    const liquidityRateRay = parseFloat(usdcReserve.liquidityRate);
    if (isNaN(liquidityRateRay) || liquidityRateRay <= 0) return null;

    // Convert ray (1e27) → APY %
    const apyDecimal = (1 + liquidityRateRay / 1e27 / 31_536_000) ** 31_536_000 - 1;
    return apyDecimal * 100;
  } catch {
    return null;
  }
}

export async function getAaveUSDCPosition(
  walletAddress: string,
): Promise<AavePosition | null> {
  try {
    // 1. Get real on-chain aUSDC balance (V2 or V3)
    const aBalance = await getAaveUSDCBalance(walletAddress);

    if (!aBalance) {
      console.warn(`[aave] No aUSDC balance found for ${walletAddress}`);
    } else {
      console.log(
        `[aave] Found aUSDC ${aBalance.version.toUpperCase()}: ${aBalance.amount.toFixed(6)} USDC`,
      );
    }

    // 2. Fetch APY for the detected version (or try both)
    const version = aBalance?.version ?? 'v3';
    let apy = await fetchAaveAPY(version);
    if (apy === null && version === 'v3') apy = await fetchAaveAPY('v2');
    if (apy === null && version === 'v2') apy = await fetchAaveAPY('v3');

    return {
      depositedAmount: null, // resolved from DB in route.ts
      currentAmount: aBalance?.amount ?? null,
      apy,
      yieldEarned: null, // computed in route.ts with deposited_amount from DB
      version: aBalance?.version ?? null,
    };
  } catch (error) {
    console.error('[aave] Error fetching Aave USDC position:', error);
    return null;
  }
}
