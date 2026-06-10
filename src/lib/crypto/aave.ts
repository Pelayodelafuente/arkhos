import { fetchWithTimeout } from '@/lib/utils/fetch-timeout';
import { getAaveUSDCBalance } from './blockchain';

export interface AavePosition {
  depositedAmount: number | null;
  currentAmount: number | null;
  apy: number | null;
  yieldEarned: number | null;
  version: 'v2' | 'v3' | null;
}

// DeFiLlama pool IDs for Aave V3 USDC on Ethereum mainnet
// aa70268e: main USDC pool (~7.35% APY, $80M TVL) — matches Aave interface
// 27296bf9: smaller variant (~2.85% APY, $4M TVL)
const DEFI_LLAMA_POOLS = [
  'aa70268e-4b52-42bf-a116-608b370f9501',
  '27296bf9-617a-46e4-9d6d-eefc71e9e0b6',
];

interface DefiLlamaPool {
  pool: string;
  apy: number;
  [key: string]: unknown;
}

interface DefiLlamaResponse {
  status: string;
  data: DefiLlamaPool;
}

async function fetchAaveAPY(_version: 'v2' | 'v3'): Promise<number | null> {
  for (const poolId of DEFI_LLAMA_POOLS) {
    try {
      const response = await fetchWithTimeout(`https://yields.llama.fi/pool/${poolId}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 }, // cache 1h
      });
      if (!response.ok) continue;
      const json = (await response.json()) as DefiLlamaResponse;
      const apy = json?.data?.apy;
      if (typeof apy === 'number' && apy > 0) return apy;
    } catch {
      continue;
    }
  }
  return null;
}

export async function getAaveUSDCPosition(
  walletAddress: string,
): Promise<AavePosition | null> {
  try {
    // 1. Get real on-chain aUSDC balance (V2 or V3)
    const aBalance = await getAaveUSDCBalance(walletAddress);

    if (!aBalance) {
      console.warn(`[aave] No aUSDC balance found for ${walletAddress}`);
    }

    // 2. Fetch current APY from DeFiLlama (Aave V3 USDC Ethereum)
    const version = aBalance?.version ?? 'v3';
    const apy = await fetchAaveAPY(version);

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
