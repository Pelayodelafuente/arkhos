import { fetchWithTimeout } from '@/lib/utils/fetch-timeout';
export type CoinGeckoPrices = Record<
  string,
  { eur: number; eur_24h_change: number }
>;

const COINGECKO_IDS = [
  'bitcoin',
  'ethereum',
  'usd-coin',
];

export async function getCoinGeckoPrices(): Promise<CoinGeckoPrices | null> {
  try {
    const url = new URL('https://api.coingecko.com/api/v3/simple/price');
    url.searchParams.set('ids', COINGECKO_IDS.join(','));
    url.searchParams.set('vs_currencies', 'eur');
    url.searchParams.set('include_24hr_change', 'true');

    const response = await fetchWithTimeout(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(
        `[coingecko] HTTP ${response.status}: ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as CoinGeckoPrices;
    return data;
  } catch (error) {
    console.error('[coingecko] Error fetching prices:', error);
    return null;
  }
}
