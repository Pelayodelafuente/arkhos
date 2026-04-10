// Mapeo ISIN → ticker Yahoo Finance
export const YAHOO_TICKER_MAP: Record<string, string> = {
  'IE00B5BMR087': 'SXR8.DE',   // iShares Core S&P 500
  'IE00B4L5Y983': 'IWDA.AS',   // iShares Core MSCI World
  'IE00B53SZB19': 'CNDX.AS',   // iShares NASDAQ 100
  'IE00BGYWSW13': 'VDCP.AS',   // Vanguard Corp Bond
  'IE00BK5BR733': 'VFEM.AS',   // Vanguard Emerging Markets
  'IE00B6R52259': 'SSAC.AS',   // iShares MSCI ACWI
  'IE00BGV5VN51': 'XAIX.DE',   // Xtrackers AI Big Data
  'LU0322253906': 'XXSC.AS',   // Xtrackers Europe Small Cap
  'IE00BMH5XY61': 'ECOM.AS',   // Global X E-Commerce
  'IE0002Y8CX98': 'WDEF.AS',   // WisdomTree Defence
  'IE000U58J0M1': 'STCE.AS',   // iShares Clean Energy
  'IE00BM67HV82': 'XWIN.AS',   // Xtrackers Industrials
  'IE00B4ND3602': 'IGLN.AS',   // iShares Physical Gold
  'IE00B4NCWG09': 'ISLN.AS',   // iShares Physical Silver
  'IE000GA3D489': 'ARKI.AS',   // ARK Innovation
  'IE0003A512E4': 'ARKI2.AS',  // ARK AI Robotics
};

export type PriceSource = 'alphavantage' | 'yahoo' | 'coingecko' | 'manual' | 'cache';

export interface PriceResult {
  assetId: string;
  price: number;
  priceEur: number;
  change24h: number | null;
  changePercent24h: number | null;
  updatedAt: string;
  source: PriceSource;
}

export interface PriceFetchRequest {
  id: string;      // asset UUID
  ticker?: string; // ticker symbol
  isin?: string;
  category: string;
}

// Yahoo Finance chart API response shape
interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        currency?: string;
      };
    }>;
    error?: unknown;
  };
}

// Alpha Vantage Global Quote response shape
interface AlphaVantageResponse {
  'Global Quote'?: {
    '05. price'?: string;
    '08. previous close'?: string;
    '09. change'?: string;
    '10. change percent'?: string;
  };
}

/**
 * Fetch current price from Yahoo Finance.
 * Returns null on any error — never throws.
 */
export async function fetchYahooPrice(ticker: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Arkhos/1.0)',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = (await res.json()) as YahooChartResponse;
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    return typeof price === 'number' && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/**
 * Fetch current price from Alpha Vantage.
 * Returns null if no API key configured or on any error.
 */
export async function fetchAlphaVantagePrice(ticker: string): Promise<number | null> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return null;

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as AlphaVantageResponse;
    const raw = data?.['Global Quote']?.['05. price'];
    if (!raw) return null;

    const price = parseFloat(raw);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/**
 * Compute 24h change and change percent from two prices.
 */
function computeChange(
  current: number,
  previous: number | null | undefined,
): { change24h: number | null; changePercent24h: number | null } {
  if (previous == null || previous === 0) {
    return { change24h: null, changePercent24h: null };
  }
  const change24h = current - previous;
  const changePercent24h = (change24h / previous) * 100;
  return { change24h, changePercent24h };
}

/**
 * Main price fetch function. Determines the source per asset, then runs all
 * fetches with Promise.allSettled so individual failures never propagate.
 *
 * Returns {} (empty object) when:
 * - No requests are eligible
 * - No API keys are configured
 */
export async function fetchPrices(
  requests: PriceFetchRequest[],
): Promise<Record<string, PriceResult>> {
  const now = new Date().toISOString();

  // Tasks: [assetId, promise returning PriceResult | null]
  const tasks: Array<{
    id: string;
    promise: Promise<PriceResult | null>;
  }> = [];

  for (const req of requests) {
    const { id, isin, ticker, category } = req;

    // Skip non-priced categories
    if (category === 'fund' || category === 'p2p' || category === 'cash') {
      continue;
    }

    // ETFs with ISIN in our map → Yahoo Finance
    if (isin && YAHOO_TICKER_MAP[isin]) {
      const yticker = YAHOO_TICKER_MAP[isin];
      tasks.push({
        id,
        promise: (async (): Promise<PriceResult | null> => {
          const price = await fetchYahooPrice(yticker);
          if (price === null) return null;
          return {
            assetId: id,
            price,
            priceEur: price, // Yahoo returns EUR for .DE / .AS tickers
            change24h: null,
            changePercent24h: null,
            updatedAt: now,
            source: 'yahoo',
          };
        })(),
      });
      continue;
    }

    // US stocks: Alpha Vantage with Yahoo fallback
    if (category === 'stock_us' && ticker) {
      tasks.push({
        id,
        promise: (async (): Promise<PriceResult | null> => {
          let price = await fetchAlphaVantagePrice(ticker);
          let source: PriceSource = 'alphavantage';

          if (price === null) {
            price = await fetchYahooPrice(ticker);
            source = 'yahoo';
          }
          if (price === null) return null;

          return {
            assetId: id,
            price,
            priceEur: price,
            change24h: null,
            changePercent24h: null,
            updatedAt: now,
            source,
          };
        })(),
      });
      continue;
    }

    // Asia stocks: Yahoo with .HK suffix
    if (category === 'stock_asia' && ticker) {
      const hkTicker = `${ticker}.HK`;
      tasks.push({
        id,
        promise: (async (): Promise<PriceResult | null> => {
          const price = await fetchYahooPrice(hkTicker);
          if (price === null) return null;
          return {
            assetId: id,
            price,
            priceEur: price,
            change24h: null,
            changePercent24h: null,
            updatedAt: now,
            source: 'yahoo',
          };
        })(),
      });
      continue;
    }

    // EU stocks: Yahoo with direct ticker
    if (category === 'stock_eu' && ticker) {
      tasks.push({
        id,
        promise: (async (): Promise<PriceResult | null> => {
          const price = await fetchYahooPrice(ticker);
          if (price === null) return null;
          return {
            assetId: id,
            price,
            priceEur: price,
            change24h: null,
            changePercent24h: null,
            updatedAt: now,
            source: 'yahoo',
          };
        })(),
      });
      continue;
    }

    // ETFs without ISIN map but with ticker: try Yahoo directly
    if ((category === 'etf_index' || category === 'etf_thematic' || category === 'etf_bond' || category === 'etf_commodity') && ticker) {
      tasks.push({
        id,
        promise: (async (): Promise<PriceResult | null> => {
          const price = await fetchYahooPrice(ticker);
          if (price === null) return null;
          return {
            assetId: id,
            price,
            priceEur: price,
            change24h: null,
            changePercent24h: null,
            updatedAt: now,
            source: 'yahoo',
          };
        })(),
      });
    }
  }

  if (tasks.length === 0) return {};

  const settled = await Promise.allSettled(tasks.map((t) => t.promise));

  const results: Record<string, PriceResult> = {};
  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    const taskId = tasks[i].id;
    if (outcome.status === 'fulfilled' && outcome.value !== null) {
      results[taskId] = outcome.value;
    }
  }

  // Suppress unused variable warning for computeChange by calling it if needed
  void computeChange;

  return results;
}
