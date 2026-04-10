import type { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// ISIN → Ticker maps
// ---------------------------------------------------------------------------

export const YAHOO_TICKER_MAP: Record<string, string> = {
  'IE00B5BMR087': 'SXR8.DE',    // iShares Core S&P 500
  'IE00B4L5Y983': 'IWDA.AS',    // iShares Core MSCI World
  'IE00B53SZB19': 'CNDX.AS',    // iShares NASDAQ 100
  'IE00BGYWSW13': 'VDCP.AS',    // Vanguard Corp Bond
  'IE00BK5BR733': 'VFEM.AS',    // Vanguard Emerging Markets
  'IE00B6R52259': 'SSAC.AS',    // iShares MSCI ACWI
  'IE00BGV5VN51': 'XAIX.DE',    // Xtrackers AI Big Data
  'LU0322253906': 'XXSC.AS',    // Xtrackers Europe Small Cap
  'IE00BMH5XY61': 'ECOM.AS',    // Global X E-Commerce
  'IE0002Y8CX98': 'WDEF.AS',    // WisdomTree Defence
  'IE000U58J0M1': 'STCE.AS',    // iShares Clean Energy
  'IE00BM67HV82': 'XWIN.AS',    // Xtrackers Industrials
  'IE00B4ND3602': 'IGLN.AS',    // iShares Physical Gold
  'IE00B4NCWG09': 'ISLN.AS',    // iShares Physical Silver
  'IE000GA3D489': 'ARKI.AS',    // ARK Innovation
  'IE0003A512E4': 'ARKI2.AS',   // ARK AI Robotics
};

export const ALPHAVANTAGE_TICKER_MAP: Record<string, string> = {
  'US67066G1040': 'NVDA',
  'US88160R1014': 'TSLA',
  'US02079K1079': 'GOOGL',
  'US30303M1027': 'META',
  'US0231351067': 'AMZN',
  'US90353T1007': 'UBER',
  'US26740W1099': 'QBTS',
  'US8740391003': 'TSM',
  'US70450Y1038': 'PYPL',
  'US91324P1021': 'UNH',
  'US0079031078': 'AMD',
};

export const YAHOO_HK_TICKER_MAP: Record<string, string> = {
  'CNE100000296': '1211.HK',  // BYD
  'KYG9830T1067': '1810.HK',  // Xiaomi
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PriceResult {
  isin: string;
  priceEur: number;
  changePercent: number | null;
  source: 'yahoo' | 'alphavantage' | 'yahoo_hk' | 'cache' | 'fallback';
  updatedAt: string;
}

export interface ForexRates {
  usdToEur: number;
  hkdToEur: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Market hours helpers (CET = UTC+1 / UTC+2 in DST)
// ---------------------------------------------------------------------------

function getCetHour(): number {
  const now = new Date();
  // Use Europe/Madrid offset as CET proxy
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const cetOffset = now.toLocaleString('en-US', { timeZone: 'Europe/Madrid', hour12: false })
    .split(',')[1]?.trim().split(':')[0];
  const cetHour = cetOffset ? parseInt(cetOffset, 10) : Math.floor(utcMs / 3_600_000) % 24 + 1;
  return cetHour;
}

function getCetDay(): number {
  const now = new Date();
  const cetStr = now.toLocaleString('en-US', { timeZone: 'Europe/Madrid', weekday: 'long' });
  const days: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };
  return days[cetStr] ?? now.getDay();
}

export function isEUMarketOpen(): boolean {
  const day = getCetDay();
  if (day === 0 || day === 6) return false;
  const hour = getCetHour();
  return hour >= 9 && hour < 18; // 09:00-17:30 CET (use 18 as safe upper bound)
}

export function isUSMarketOpen(): boolean {
  const day = getCetDay();
  if (day === 0 || day === 6) return false;
  const hour = getCetHour();
  return hour >= 15 && hour < 22; // 14:30-21:00 CET
}

export function isHKMarketOpen(): boolean {
  const day = getCetDay();
  if (day === 0 || day === 6) return false;
  const hour = getCetHour();
  return (hour >= 3 && hour < 6) || (hour >= 7 && hour < 10); // 02:30-05:00 and 07:00-09:00 CET
}

// ---------------------------------------------------------------------------
// Forex rates — ExchangeRate-API, TTL 24h
// ---------------------------------------------------------------------------

const FOREX_CACHE_KEY = 'forex:rates';
const FOREX_FALLBACK: ForexRates = {
  usdToEur: 0.92,
  hkdToEur: 0.118,
  updatedAt: '',
};

interface ExchangeRateApiResponse {
  result?: string;
  conversion_rates?: Record<string, number>;
}

async function getForexRates(redis: Redis): Promise<ForexRates> {
  try {
    const cached = await redis.get<ForexRates>(FOREX_CACHE_KEY);
    if (cached) return cached;

    const key = process.env.EXCHANGE_RATE_API_KEY;
    if (!key) return FOREX_FALLBACK;

    const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/USD`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return FOREX_FALLBACK;

    const data = (await res.json()) as ExchangeRateApiResponse;
    if (data.result !== 'success' || !data.conversion_rates) return FOREX_FALLBACK;

    const rates = data.conversion_rates;
    const eurRate = rates['EUR'];
    const hkdRate = rates['HKD'];
    if (!eurRate || !hkdRate) return FOREX_FALLBACK;

    const forex: ForexRates = {
      usdToEur: eurRate,
      hkdToEur: eurRate / hkdRate,
      updatedAt: new Date().toISOString(),
    };

    await redis.setex(FOREX_CACHE_KEY, 86400, forex);
    return forex;
  } catch {
    return FOREX_FALLBACK;
  }
}

// ---------------------------------------------------------------------------
// Ticker fallback: if .AS fails → try .L; if .DE fails → try .F
// ---------------------------------------------------------------------------

function getAlternativeTickers(ticker: string): string[] {
  const alts: string[] = [ticker];
  if (ticker.endsWith('.AS')) {
    alts.push(ticker.replace('.AS', '.L'));
    alts.push(ticker.replace('.AS', '.MI'));
  } else if (ticker.endsWith('.DE')) {
    alts.push(ticker.replace('.DE', '.F'));
    alts.push(ticker.replace('.DE', '.L'));
  }
  return alts;
}

// ---------------------------------------------------------------------------
// Yahoo Finance — individual ticker (EUR)
// ---------------------------------------------------------------------------

interface YahooChartMeta {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{ meta?: YahooChartMeta }>;
    error?: unknown;
  };
}

interface YahooPriceData {
  price: number;
  changePercent: number | null;
}

async function fetchYahooSingle(
  ticker: string,
  redis: Redis,
  cacheKey: string,
  ttl: number,
): Promise<YahooPriceData | null> {
  try {
    const cached = await redis.get<YahooPriceData>(cacheKey);
    if (cached) return cached;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Arkhos/1.0)' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as YahooChartResponse;
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (!price || price <= 0) return null;

    const result: YahooPriceData = {
      price,
      changePercent: meta?.regularMarketChangePercent ?? null,
    };

    await redis.setex(cacheKey, ttl, result);
    return result;
  } catch {
    return null;
  }
}

// Try primary ticker first; if it returns null, try alternative suffixes in order
async function fetchYahooWithFallback(
  primaryTicker: string,
  redis: Redis,
  ttl: number,
): Promise<{ data: YahooPriceData; resolvedTicker: string } | null> {
  const alternatives = getAlternativeTickers(primaryTicker);
  for (const alt of alternatives) {
    const result = await fetchYahooSingle(alt, redis, `price:yahoo:${alt}`, ttl);
    if (result) return { data: result, resolvedTicker: alt };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fetch Yahoo ETFs (EUR prices)
// ---------------------------------------------------------------------------

async function fetchYahooPrices(
  isinTickerMap: Record<string, string>,
  redis: Redis,
): Promise<Map<string, YahooPriceData>> {
  const ttl = isEUMarketOpen() ? 3600 : 14400;
  const entries = Object.entries(isinTickerMap);

  const results = await Promise.allSettled(
    entries.map(([, ticker]) => fetchYahooWithFallback(ticker, redis, ttl)),
  );

  const map = new Map<string, YahooPriceData>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const [isin, primaryTicker] = entries[i];
    if (r.status === 'fulfilled' && r.value) {
      if (r.value.resolvedTicker !== primaryTicker) {
        console.log(`[prices] Ticker fallback used: ${primaryTicker} → ${r.value.resolvedTicker}`);
      }
      map.set(isin, r.value.data);
    } else {
      console.log(`[prices] Yahoo EU failed for ISIN ${isin} (ticker: ${primaryTicker})`);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Fetch Yahoo HK (HKD prices → convert to EUR)
// ---------------------------------------------------------------------------

async function fetchYahooHKPrices(
  isinTickerMap: Record<string, string>,
  redis: Redis,
  hkdToEur: number,
): Promise<Map<string, YahooPriceData>> {
  const ttl = isHKMarketOpen() ? 3600 : 14400;
  const entries = Object.entries(isinTickerMap);

  const results = await Promise.allSettled(
    entries.map(([, ticker]) =>
      fetchYahooSingle(ticker, redis, `price:yahoo_hk:${ticker}`, ttl),
    ),
  );

  const map = new Map<string, YahooPriceData>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const isin = entries[i][0];
    if (r.status === 'fulfilled' && r.value) {
      map.set(isin, {
        price: r.value.price * hkdToEur,
        changePercent: r.value.changePercent,
      });
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Alpha Vantage batch (USD → EUR)
// ---------------------------------------------------------------------------

interface AVBatchStockQuote {
  '1. symbol': string;
  '2. price': string;
  '3. volume'?: string;
  '4. timestamp'?: string;
}

interface AVBatchResponse {
  'Stock Quotes'?: AVBatchStockQuote[];
  'Note'?: string;
  'Information'?: string;
}

interface AVGlobalQuote {
  '05. price'?: string;
  '10. change percent'?: string;
}

interface AVGlobalResponse {
  'Global Quote'?: AVGlobalQuote;
  'Note'?: string;
  'Information'?: string;
}

async function fetchAlphaVantageBatch(
  isinTickerMap: Record<string, string>,
  redis: Redis,
  usdToEur: number,
): Promise<Map<string, YahooPriceData>> {
  const ttl = isUSMarketOpen() ? 3600 : 14400;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return new Map();

  const entries = Object.entries(isinTickerMap);
  const map = new Map<string, YahooPriceData>();

  // Check cache first — only fetch tickers not in cache
  const missingEntries: typeof entries = [];
  for (const [isin, ticker] of entries) {
    const cached = await redis.get<YahooPriceData>(`price:av:${ticker}`);
    if (cached) {
      map.set(isin, cached);
    } else {
      missingEntries.push([isin, ticker]);
    }
  }

  if (missingEntries.length === 0) return map;

  const symbols = missingEntries.map(([, t]) => t).join(',');

  // Try BATCH_STOCK_QUOTES first
  try {
    const url = `https://www.alphavantage.co/query?function=BATCH_STOCK_QUOTES&symbols=${encodeURIComponent(symbols)}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      const data = (await res.json()) as AVBatchResponse;
      if (!data['Note'] && !data['Information'] && data['Stock Quotes']) {
        const quotes = data['Stock Quotes'];
        for (const quote of quotes) {
          const ticker = quote['1. symbol'];
          const price = parseFloat(quote['2. price']);
          if (!Number.isFinite(price) || price <= 0) continue;

          const entry = missingEntries.find(([, t]) => t === ticker);
          if (!entry) continue;
          const [isin] = entry;

          const result: YahooPriceData = {
            price: price * usdToEur,
            changePercent: null,
          };
          map.set(isin, result);
          await redis.setex(`price:av:${ticker}`, ttl, result).catch(() => {});
        }
        return map;
      }
    }
  } catch {
    // Batch failed — fall through to individual calls
  }

  // Fallback: individual GLOBAL_QUOTE calls (respect rate limit with staggering)
  const individualResults = await Promise.allSettled(
    missingEntries.map(async ([isin, ticker], i) => {
      // Stagger requests slightly to avoid simultaneous bursts
      await new Promise((r) => setTimeout(r, i * 200));
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) return null;
      const data = (await res.json()) as AVGlobalResponse;
      if (data['Note'] || data['Information']) return null;

      const raw = data['Global Quote'];
      const priceStr = raw?.['05. price'];
      if (!priceStr) return null;
      const price = parseFloat(priceStr);
      if (!Number.isFinite(price) || price <= 0) return null;

      const changePctStr = raw?.['10. change percent']?.replace('%', '');
      const changePercent = changePctStr ? parseFloat(changePctStr) : null;

      const result: YahooPriceData = {
        price: price * usdToEur,
        changePercent: Number.isFinite(changePercent as number) ? (changePercent as number) : null,
      };
      await redis.setex(`price:av:${ticker}`, ttl, result).catch(() => {});
      return { isin, result };
    }),
  );

  for (const r of individualResults) {
    if (r.status === 'fulfilled' && r.value) {
      map.set(r.value.isin, r.value.result);
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Main export: fetchAllTRPrices
// ---------------------------------------------------------------------------

export async function fetchAllTRPrices(redis: Redis): Promise<{
  prices: PriceResult[];
  forex: ForexRates;
  errors: string[];
}> {
  const errors: string[] = [];
  const now = new Date().toISOString();

  // 1. Forex rates
  const forex = await getForexRates(redis);
  if (!forex.updatedAt) {
    errors.push('Forex rates unavailable — using fallback (USD 0.92, HKD 0.118)');
  }

  // 2. Fetch all three sources in parallel
  const [euResults, usResults, hkResults] = await Promise.allSettled([
    fetchYahooPrices(YAHOO_TICKER_MAP, redis),
    fetchAlphaVantageBatch(ALPHAVANTAGE_TICKER_MAP, redis, forex.usdToEur),
    fetchYahooHKPrices(YAHOO_HK_TICKER_MAP, redis, forex.hkdToEur),
  ]);

  const euMap = euResults.status === 'fulfilled' ? euResults.value : new Map<string, YahooPriceData>();
  const usMap = usResults.status === 'fulfilled' ? usResults.value : new Map<string, YahooPriceData>();
  const hkMap = hkResults.status === 'fulfilled' ? hkResults.value : new Map<string, YahooPriceData>();

  if (euResults.status === 'rejected') errors.push('Yahoo EU fetch failed');
  if (usResults.status === 'rejected') errors.push('Alpha Vantage fetch failed');
  if (hkResults.status === 'rejected') errors.push('Yahoo HK fetch failed');

  // Diagnostic logging — helps identify which ISINs/tickers are failing
  console.log('[prices] Yahoo EU results (ISINs):', [...euMap.keys()]);
  console.log('[prices] Alpha Vantage results (ISINs):', [...usMap.keys()]);
  console.log('[prices] Yahoo HK results (ISINs):', [...hkMap.keys()]);
  console.log('[prices] Errors:', errors);

  // Log missing tickers for easy diagnosis
  const missingEU = Object.keys(YAHOO_TICKER_MAP).filter((isin) => !euMap.has(isin));
  const missingUS = Object.keys(ALPHAVANTAGE_TICKER_MAP).filter((isin) => !usMap.has(isin));
  const missingHK = Object.keys(YAHOO_HK_TICKER_MAP).filter((isin) => !hkMap.has(isin));
  if (missingEU.length) console.log('[prices] Missing Yahoo EU ISINs:', missingEU.map((isin) => `${isin}→${YAHOO_TICKER_MAP[isin]}`));
  if (missingUS.length) console.log('[prices] Missing Alpha Vantage ISINs:', missingUS.map((isin) => `${isin}→${ALPHAVANTAGE_TICKER_MAP[isin]}`));
  if (missingHK.length) console.log('[prices] Missing Yahoo HK ISINs:', missingHK.map((isin) => `${isin}→${YAHOO_HK_TICKER_MAP[isin]}`) );

  // 3. Build result array
  const prices: PriceResult[] = [];

  for (const [isin] of Object.entries(YAHOO_TICKER_MAP)) {
    const d = euMap.get(isin);
    if (d) {
      prices.push({ isin, priceEur: d.price, changePercent: d.changePercent, source: 'yahoo', updatedAt: now });
    }
  }

  for (const [isin] of Object.entries(ALPHAVANTAGE_TICKER_MAP)) {
    const d = usMap.get(isin);
    if (d) {
      prices.push({ isin, priceEur: d.price, changePercent: d.changePercent, source: 'alphavantage', updatedAt: now });
    }
  }

  for (const [isin] of Object.entries(YAHOO_HK_TICKER_MAP)) {
    const d = hkMap.get(isin);
    if (d) {
      prices.push({ isin, priceEur: d.price, changePercent: d.changePercent, source: 'yahoo_hk', updatedAt: now });
    }
  }

  return { prices, forex, errors };
}
