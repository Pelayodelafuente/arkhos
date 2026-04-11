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

export const FINNHUB_TICKER_MAP: Record<string, string> = {
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
  source: 'yahoo' | 'finnhub' | 'yahoo_hk' | 'cache' | 'fallback';
  updatedAt: string;
}

export interface ForexRates {
  usdToEur: number;
  gbpToEur: number;
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

// v3: in sync with price:yahoo:v3 — all cache entries rebuilt together
const FOREX_CACHE_KEY = 'forex:rates:v3';
const FOREX_FALLBACK: ForexRates = {
  usdToEur: 0.92,
  gbpToEur: 1.17,
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
    const gbpRate = rates['GBP'];
    const hkdRate = rates['HKD'];
    if (!eurRate || !gbpRate || !hkdRate) return FOREX_FALLBACK;

    const forex: ForexRates = {
      usdToEur: eurRate,
      gbpToEur: eurRate / gbpRate,
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
// Universal EUR conversion
// ---------------------------------------------------------------------------

function convertToEur(
  rawPrice: number,
  currency: string,
  forex: ForexRates,
  ticker: string,
): number | null {
  if (!forex.gbpToEur || !forex.usdToEur || !forex.hkdToEur) return null;

  // London Stock Exchange tickers (.L): Yahoo sometimes reports currency=USD
  // but the price is always in GBX (pence) or GBP — ignore Yahoo's currency field.
  // Heuristic: raw > 500 → GBX (pence), raw ≤ 500 → GBP.
  if (ticker.endsWith('.L')) {
    if (rawPrice > 500) {
      return (rawPrice / 100) * forex.gbpToEur; // GBX → GBP → EUR
    } else {
      return rawPrice * forex.gbpToEur; // GBP → EUR
    }
  }

  if (currency === 'GBp') {
    return (rawPrice / 100) * forex.gbpToEur; // GBX = pence
  } else if (currency === 'GBP') {
    return rawPrice * forex.gbpToEur;
  } else if (currency === 'EUR') {
    return rawPrice;
  } else if (currency === 'USD') {
    return rawPrice * forex.usdToEur;
  } else if (currency === 'HKD') {
    return rawPrice * forex.hkdToEur;
  } else {
    console.warn(`[price-service] divisa desconocida: ${currency} ticker=${ticker} raw=${rawPrice}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Ticker fallback: if .AS fails → try .L; if .DE fails → try .F
// ---------------------------------------------------------------------------

// Per-ticker overrides (tried in order before generic suffix fallbacks)
const TICKER_ALTERNATIVES: Record<string, string[]> = {
  // iShares Clean Energy — INRG.L is London listing; also try INRG.AS and WCEU.L
  'STCE.AS':  ['STCE.AS', 'INRG.L', 'INRG.AS', 'WCEU.L', 'IQQH.DE'],
  // Xtrackers World Industrials — try all known exchange suffixes
  'XWIN.AS':  ['XWIN.AS', 'XDWD.L', 'XWIN.L', 'DBXI.DE', 'XWID.AS'],
  'ARKI2.AS': ['ARKI2.AS', 'ARKI2.L', '2B76.DE'],  // ARK AI Robotics
  'ARKI.AS':  ['ARKI.AS',  'ARKI.L'],               // ARK Innovation
  'ECOM.AS':  ['ECOM.AS',  'ECOM.L'],               // Global X E-Commerce
  'WDEF.AS':  ['WDEF.AS',  'WDEF.L'],               // WisdomTree Defence
  'SSAC.AS':  ['SSAC.AS',  'SSAC.L'],               // iShares MSCI ACWI
};

function getAlternativeTickers(ticker: string): string[] {
  if (TICKER_ALTERNATIVES[ticker]) return TICKER_ALTERNATIVES[ticker];

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
  currency?: string;
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
  forex: ForexRates,
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
    const rawPrice = meta?.regularMarketPrice;
    if (!rawPrice || rawPrice <= 0) return null;

    const currency = meta?.currency ?? 'EUR';
    const priceEur = convertToEur(rawPrice, currency, forex, ticker);

    // Verification log — visible in Vercel logs on every cache miss
    const appliedCurrency = ticker.endsWith('.L')
      ? (rawPrice > 500 ? 'GBX→GBP(.L)' : 'GBP(.L)')
      : currency;
    const rateUsed = (appliedCurrency.startsWith('GB'))
      ? `gbpToEur=${forex.gbpToEur?.toFixed(4) ?? 'UNDEFINED'}`
      : appliedCurrency === 'HKD'
      ? `hkdToEur=${forex.hkdToEur?.toFixed(4) ?? 'UNDEFINED'}`
      : appliedCurrency === 'USD'
      ? `usdToEur=${forex.usdToEur?.toFixed(4) ?? 'UNDEFINED'}`
      : 'no conversion';
    const resultLabel = priceEur !== null && Number.isFinite(priceEur)
      ? `${priceEur.toFixed(2)}€`
      : `null/NaN (skipped)`;
    console.log(`[price-service] VERIFY ticker=${ticker} raw=${rawPrice} yahoo_currency=${currency} applied=${appliedCurrency} → ${rateUsed} → result=${resultLabel}`);

    if (priceEur === null || !Number.isFinite(priceEur)) return null;

    const result: YahooPriceData = {
      price: priceEur,
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
  forex: ForexRates,
): Promise<{ data: YahooPriceData; resolvedTicker: string } | null> {
  const alternatives = getAlternativeTickers(primaryTicker);
  for (const alt of alternatives) {
    // v4: .L tickers now override Yahoo's currency field (was reporting USD incorrectly)
    const result = await fetchYahooSingle(alt, redis, `price:yahoo:v4:${alt}`, ttl, forex);
    if (result) return { data: result, resolvedTicker: alt };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fetch Yahoo ETFs (EUR prices)
// ---------------------------------------------------------------------------

interface YahooPricesResult {
  map: Map<string, YahooPriceData>;
  /** ISIN → resolved ticker (may differ from primary if fallback was used) */
  resolvedTickers: Map<string, string>;
}

async function fetchYahooPrices(
  isinTickerMap: Record<string, string>,
  redis: Redis,
  forex: ForexRates,
): Promise<YahooPricesResult> {
  const ttl = isEUMarketOpen() ? 3600 : 14400;
  const entries = Object.entries(isinTickerMap);

  const results = await Promise.allSettled(
    entries.map(([, ticker]) => fetchYahooWithFallback(ticker, redis, ttl, forex)),
  );

  const map = new Map<string, YahooPriceData>();
  const resolvedTickers = new Map<string, string>();

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const [isin, primaryTicker] = entries[i];
    if (r.status === 'fulfilled' && r.value) {
      if (r.value.resolvedTicker !== primaryTicker) {
        console.log(`[prices] Ticker fallback used: ${primaryTicker} → ${r.value.resolvedTicker}`);
      }
      map.set(isin, r.value.data);
      resolvedTickers.set(isin, r.value.resolvedTicker);
    } else {
      console.log(`[prices] Yahoo EU failed for ISIN ${isin} (ticker: ${primaryTicker})`);
    }
  }
  return { map, resolvedTickers };
}

// ---------------------------------------------------------------------------
// Fetch Yahoo HK (HKD prices → convert to EUR)
// ---------------------------------------------------------------------------

async function fetchYahooHKPrices(
  isinTickerMap: Record<string, string>,
  redis: Redis,
  forex: ForexRates,
): Promise<Map<string, YahooPriceData>> {
  const ttl = isHKMarketOpen() ? 3600 : 14400;
  const entries = Object.entries(isinTickerMap);

  const results = await Promise.allSettled(
    entries.map(([, ticker]) =>
      // v4: aligned with EU cache version bump
      fetchYahooSingle(ticker, redis, `price:yahoo_hk:v4:${ticker}`, ttl, forex),
    ),
  );

  const map = new Map<string, YahooPriceData>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const isin = entries[i][0];
    if (r.status === 'fulfilled' && r.value) {
      map.set(isin, r.value); // already converted to EUR by fetchYahooSingle
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Finnhub — acciones USA (USD → EUR)
// ---------------------------------------------------------------------------

interface FinnhubQuote {
  c: number;   // current price
  d: number;   // day change $
  dp: number;  // day change %
  h: number;   // high
  l: number;   // low
  o: number;   // open
  pc: number;  // previous close
}

async function fetchFinnhubSingle(
  ticker: string,
  redis: Redis,
  usdToEur: number,
  ttl: number,
): Promise<YahooPriceData | null> {
  const cacheKey = `price:finnhub:${ticker}`;
  try {
    const cached = await redis.get<YahooPriceData>(cacheKey);
    if (cached) return cached;

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return null;

    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    if (!res.ok) return null;

    const data = (await res.json()) as FinnhubQuote;

    // c === 0 means no data (market closed with no cached price on their end)
    if (!data.c || data.c <= 0) return null;

    const result: YahooPriceData = {
      price: data.c * usdToEur,
      changePercent: Number.isFinite(data.dp) ? data.dp : null,
    };

    await redis.setex(cacheKey, ttl, result);
    return result;
  } catch {
    return null;
  }
}

async function fetchFinnhubPrices(
  isinTickerMap: Record<string, string>,
  redis: Redis,
  usdToEur: number,
): Promise<Map<string, YahooPriceData>> {
  const ttl = isUSMarketOpen() ? 3600 : 14400;
  const entries = Object.entries(isinTickerMap);

  const results = await Promise.allSettled(
    entries.map(([, ticker]) => fetchFinnhubSingle(ticker, redis, usdToEur, ttl)),
  );

  const map = new Map<string, YahooPriceData>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const [isin, ticker] = entries[i];
    if (r.status === 'fulfilled' && r.value) {
      map.set(isin, r.value);
    } else {
      console.log(`[prices] Finnhub failed for ISIN ${isin} (ticker: ${ticker})`);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main export: fetchAllTRPrices
// ---------------------------------------------------------------------------

export interface PriceDebugInfo {
  yahoo_eu_count: number;
  finnhub_count: number;
  yahoo_hk_count: number;
  missing_isins: string[];
  /** ISIN → resolved ticker (shows fallback when primary failed) */
  tickers_tried: Record<string, string>;
}

export async function fetchAllTRPrices(redis: Redis): Promise<{
  prices: PriceResult[];
  forex: ForexRates;
  errors: string[];
  debug: PriceDebugInfo;
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
    fetchYahooPrices(YAHOO_TICKER_MAP, redis, forex),
    fetchFinnhubPrices(FINNHUB_TICKER_MAP, redis, forex.usdToEur),
    fetchYahooHKPrices(YAHOO_HK_TICKER_MAP, redis, forex),
  ]);

  const euFull = euResults.status === 'fulfilled' ? euResults.value : { map: new Map<string, YahooPriceData>(), resolvedTickers: new Map<string, string>() };
  const euMap = euFull.map;
  const euResolvedTickers = euFull.resolvedTickers;
  const usMap = usResults.status === 'fulfilled' ? usResults.value : new Map<string, YahooPriceData>();
  const hkMap = hkResults.status === 'fulfilled' ? hkResults.value : new Map<string, YahooPriceData>();

  if (euResults.status === 'rejected') errors.push('Yahoo EU fetch failed');
  if (usResults.status === 'rejected') errors.push('Finnhub fetch failed');
  if (hkResults.status === 'rejected') errors.push('Yahoo HK fetch failed');

  // Build debug info
  const missingEU = Object.keys(YAHOO_TICKER_MAP).filter((isin) => !euMap.has(isin));
  const missingUS = Object.keys(FINNHUB_TICKER_MAP).filter((isin) => !usMap.has(isin));
  const missingHK = Object.keys(YAHOO_HK_TICKER_MAP).filter((isin) => !hkMap.has(isin));

  const tickersTried: Record<string, string> = {};
  for (const [isin, primaryTicker] of Object.entries(YAHOO_TICKER_MAP)) {
    tickersTried[isin] = euResolvedTickers.get(isin) ?? `${primaryTicker} (failed)`;
  }
  for (const [isin, ticker] of Object.entries(FINNHUB_TICKER_MAP)) {
    tickersTried[isin] = usMap.has(isin) ? ticker : `${ticker} (failed)`;
  }
  for (const [isin, ticker] of Object.entries(YAHOO_HK_TICKER_MAP)) {
    tickersTried[isin] = hkMap.has(isin) ? ticker : `${ticker} (failed)`;
  }

  const debug: PriceDebugInfo = {
    yahoo_eu_count: euMap.size,
    finnhub_count: usMap.size,
    yahoo_hk_count: hkMap.size,
    missing_isins: [
      ...missingEU.map((isin) => `${isin}→${YAHOO_TICKER_MAP[isin]}`),
      ...missingUS.map((isin) => `${isin}→${FINNHUB_TICKER_MAP[isin]}`),
      ...missingHK.map((isin) => `${isin}→${YAHOO_HK_TICKER_MAP[isin]}`),
    ],
    tickers_tried: tickersTried,
  };

  // Diagnostic logging
  console.log('[prices] Yahoo EU results (ISINs):', [...euMap.keys()]);
  console.log('[prices] Finnhub results (ISINs):', [...usMap.keys()]);
  console.log('[prices] Yahoo HK results (ISINs):', [...hkMap.keys()]);
  console.log('[prices] Errors:', errors);
  if (debug.missing_isins.length) console.log('[prices] Missing ISINs:', debug.missing_isins);

  // 3. Build result array
  const prices: PriceResult[] = [];

  for (const [isin] of Object.entries(YAHOO_TICKER_MAP)) {
    const d = euMap.get(isin);
    if (d) {
      prices.push({ isin, priceEur: d.price, changePercent: d.changePercent, source: 'yahoo', updatedAt: now });
    }
  }

  for (const [isin] of Object.entries(FINNHUB_TICKER_MAP)) {
    const d = usMap.get(isin);
    if (d) {
      prices.push({ isin, priceEur: d.price, changePercent: d.changePercent, source: 'finnhub', updatedAt: now });
    }
  }

  for (const [isin] of Object.entries(YAHOO_HK_TICKER_MAP)) {
    const d = hkMap.get(isin);
    if (d) {
      prices.push({ isin, priceEur: d.price, changePercent: d.changePercent, source: 'yahoo_hk', updatedAt: now });
    }
  }

  return { prices, forex, errors, debug };
}
