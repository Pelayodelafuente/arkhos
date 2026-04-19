export interface AavePosition {
  depositedAmount: number | null;
  currentAmount: number | null;
  apy: number | null;
  yieldEarned: number | null;
}

interface AaveReserve {
  symbol: string;
  liquidityRate: string;
  [key: string]: unknown;
}

interface AaveApiResponse {
  reserves?: AaveReserve[];
  [key: string]: unknown;
}

export async function getAaveUSDCPosition(
  walletAddress: string,
): Promise<AavePosition | null> {
  console.warn(
    `[aave] On-chain balance for ${walletAddress} requires ethers.js integration. Returning APY only.`,
  );

  try {
    const url =
      'https://aave-api-v2.aave.com/data/liquidity/v2?poolId=0xb53c1a33016b2dc2ff3653530bff1848a515c8c5';

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(`[aave] HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as AaveApiResponse;
    const reserves = data.reserves ?? (Array.isArray(data) ? (data as AaveReserve[]) : []);
    const usdcReserve = reserves.find(
      (r: AaveReserve) => r.symbol === 'USDC',
    );

    if (!usdcReserve) {
      console.error('[aave] USDC reserve not found in Aave V2 response');
      return null;
    }

    // liquidityRate is a ray value (1e27). Convert to APY percentage.
    const liquidityRateRay = parseFloat(usdcReserve.liquidityRate);
    const apyDecimal = (1 + liquidityRateRay / 1e27 / 31_536_000) ** 31_536_000 - 1;
    const apyPercent = apyDecimal * 100;

    return {
      depositedAmount: null,
      currentAmount: null,
      apy: apyPercent,
      yieldEarned: null,
    };
  } catch (error) {
    console.error('[aave] Error fetching Aave USDC position:', error);
    return null;
  }
}
