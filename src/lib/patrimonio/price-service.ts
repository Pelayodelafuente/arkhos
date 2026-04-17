// ---------------------------------------------------------------------------
// TICKER_CONFIG — fuente de verdad única: ISIN → ticker + divisa + fuente
// Sin heurísticas, sin fallbacks de divisa, sin caché.
// ---------------------------------------------------------------------------

export const TICKER_CONFIG: Record<string, {
  ticker: string;
  currency: 'EUR' | 'GBP' | 'GBX' | 'USD' | 'HKD';
  source: 'yahoo' | 'finnhub' | 'yahoo_hk';
}> = {
  // ETFs EUR directos (Euronext/Xetra)
  'IE00B5BMR087': { ticker: 'SXR8.DE',  currency: 'EUR', source: 'yahoo' },
  'IE00B4L5Y983': { ticker: 'IWDA.AS',  currency: 'EUR', source: 'yahoo' },
  'IE00B53SZB19': { ticker: 'CNDX.AS',  currency: 'EUR', source: 'yahoo' },
  // VFEM: VFEM.AS en Yahoo es producto distinto; VFEA.L (USD) da 71.19€ ≈ TR 70.59€
  'IE00BK5BR733': { ticker: 'VFEA.L',   currency: 'USD', source: 'yahoo' },
  'IE00B6R52259': { ticker: 'SSAC.AS',  currency: 'EUR', source: 'yahoo' },
  'IE00BGV5VN51': { ticker: 'XAIX.DE',  currency: 'EUR', source: 'yahoo' },
  // ECOM: E61Z.DE (Xetra, EUR) — ticker verificado por ISIN IE00BMH5XY61, WKN A2QPBX
  'IE00BMH5XY61': { ticker: 'E61Z.DE',         currency: 'EUR', source: 'yahoo' },
  // AAKI.DE (Xetra, EUR) — ticker verificado por ISIN IE0003A512E4, WKN A408AX
  'IE0003A512E4': { ticker: 'AAKI.DE',          currency: 'EUR', source: 'yahoo' },
  // WDEF: WDEF.L EUR → EUDF.DE EUR (Xetra, mismo precio ~32.90€)
  'IE0002Y8CX98': { ticker: 'EUDF.DE',  currency: 'EUR', source: 'yahoo' },
  // ARK Innovation UCITS ETF — ticker verificado via Yahoo search por ISIN
  'IE000GA3D489': { ticker: 'ARXK.DE',  currency: 'EUR', source: 'yahoo' },
  // iShares Clean Energy Transition — Yahoo: INRA.AS (AMS, USD-priced ~27.96 → ~23€)
  'IE000U58J0M1': { ticker: 'INRA.AS',  currency: 'USD', source: 'yahoo' },

  // ETFs Londres en GBX (peniques → /100 → GBP → EUR)
  'LU0322253906': { ticker: 'XXSC.L',   currency: 'GBX', source: 'yahoo' },

  // ETFs Londres en USD verificados via Yahoo Finance
  'IE00B4ND3602': { ticker: 'IGLN.L',   currency: 'USD', source: 'yahoo' },
  'IE00B4NCWG09': { ticker: 'ISLN.L',   currency: 'USD', source: 'yahoo' },
  // Xtrackers World Industrials — ticker verificado via Yahoo search por ISIN (no XDWD.L que es MSCI World)
  'IE00BM67HV82': { ticker: 'XDWI.L',   currency: 'USD', source: 'yahoo' },

  // VCDE.DE (Xetra, EUR) — ticker verificado por ISIN IE00BGYWSW13, WKN A3ES6A
  'IE00BGYWSW13': { ticker: 'VCDE.DE',  currency: 'EUR', source: 'yahoo' },

  // Acciones USA via Finnhub (USD → EUR)
  'US67066G1040': { ticker: 'NVDA',     currency: 'USD', source: 'finnhub' },
  'US88160R1014': { ticker: 'TSLA',     currency: 'USD', source: 'finnhub' },
  'US02079K1079': { ticker: 'GOOGL',    currency: 'USD', source: 'finnhub' },
  'US30303M1027': { ticker: 'META',     currency: 'USD', source: 'finnhub' },
  'US0231351067': { ticker: 'AMZN',     currency: 'USD', source: 'finnhub' },
  'US90353T1007': { ticker: 'UBER',     currency: 'USD', source: 'finnhub' },
  'US26740W1099': { ticker: 'QBTS',     currency: 'USD', source: 'finnhub' },
  'US8740391003': { ticker: 'TSM',      currency: 'USD', source: 'finnhub' },
  'US70450Y1038': { ticker: 'PYPL',     currency: 'USD', source: 'finnhub' },
  'US91324P1021': { ticker: 'UNH',      currency: 'USD', source: 'finnhub' },
  'US0079031078': { ticker: 'AMD',      currency: 'USD', source: 'finnhub' },

  // Acciones Hong Kong (HKD → EUR)
  'CNE100000296': { ticker: '1211.HK',  currency: 'HKD', source: 'yahoo_hk' },
  'KYG9830T1067': { ticker: '1810.HK',  currency: 'HKD', source: 'yahoo_hk' },
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PriceResult {
  isin: string;
  priceEur: number;
  changePercent: number | null;
  source: 'yahoo' | 'finnhub' | 'yahoo_hk';
  updatedAt: string;
}

export interface ForexRates {
  usdToEur: number;
  gbpToEur: number;
  hkdToEur: number;
  updatedAt: string;
}

export interface PriceDebugInfo {
  yahoo_eu_count: number;
  finnhub_count: number;
  yahoo_hk_count: number;
  missing_isins: string[];
  tickers_tried: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Market hours helpers (CET = UTC+1 / UTC+2 in DST)
// ---------------------------------------------------------------------------

function getCetHour(): number {
  const now = new Date();
  const cetStr = now.toLocaleString('en-US', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false });
  return parseInt(cetStr, 10);
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
  return hour >= 9 && hour < 18;
}

export function isUSMarketOpen(): boolean {
  const day = getCetDay();
  if (day === 0 || day === 6) return false;
  const hour = getCetHour();
  return hour >= 15 && hour < 22;
}

export function isHKMarketOpen(): boolean {
  const day = getCetDay();
  if (day === 0 || day === 6) return false;
  const hour = getCetHour();
  return (hour >= 3 && hour < 6) || (hour >= 7 && hour < 10);
}

// ---------------------------------------------------------------------------
// Forex rates — sin caché, siempre frescos
// ---------------------------------------------------------------------------

const FOREX_FALLBACK: ForexRates = {
  usdToEur: 0.85,
  gbpToEur: 1.15,
  hkdToEur: 0.109,
  updatedAt: '',
};

interface ExchangeRateApiResponse {
  result?: string;
  conversion_rates?: Record<string, number>;
  rates?: Record<string, number>;
}

async function getForexRates(errors: string[]): Promise<ForexRates> {
  const key = process.env.EXCHANGE_RATE_API_KEY;
  if (!key) {
    errors.push('Forex API no disponible — usando tipo de cambio aproximado');
    return FOREX_FALLBACK;
  }

  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${key}/latest/USD`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as ExchangeRateApiResponse;
    const rates = data.conversion_rates ?? data.rates;
    if (!rates) throw new Error('No rates in response');

    const eurRate = rates['EUR'];
    const gbpRate = rates['GBP'];
    const hkdRate = rates['HKD'];
    if (!eurRate || !gbpRate || !hkdRate) throw new Error('Missing EUR/GBP/HKD rates');

    return {
      usdToEur: eurRate,
      gbpToEur: eurRate / gbpRate,
      hkdToEur: eurRate / hkdRate,
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    errors.push(`Forex API no disponible — usando tipo de cambio aproximado (${String(e)})`);
    return FOREX_FALLBACK;
  }
}

// ---------------------------------------------------------------------------
// EUR conversion — usa la divisa del TICKER_CONFIG, NUNCA la de Yahoo
// ---------------------------------------------------------------------------

function convertToEur(
  rawPrice: number,
  currency: 'EUR' | 'GBP' | 'GBX' | 'USD' | 'HKD',
  ticker: string,
  forex: ForexRates,
): number | null {
  if (!rawPrice || rawPrice <= 0) return null;
  switch (currency) {
    case 'EUR': return rawPrice;
    case 'GBX':
      if (!forex.gbpToEur) return null;
      return (rawPrice / 100) * forex.gbpToEur;
    case 'GBP':
      if (!forex.gbpToEur) return null;
      return rawPrice * forex.gbpToEur;
    case 'USD':
      if (!forex.usdToEur) return null;
      return rawPrice * forex.usdToEur;
    case 'HKD':
      if (!forex.hkdToEur) return null;
      return rawPrice * forex.hkdToEur;
    default:
      console.error('[price-service] divisa no soportada:', currency, ticker);
      return null;
  }
}

function formatPriceLog(
  ticker: string,
  rawPrice: number,
  currency: 'EUR' | 'GBP' | 'GBX' | 'USD' | 'HKD',
  priceEur: number,
  forex: ForexRates,
): string {
  let conversion: string;
  switch (currency) {
    case 'EUR': conversion = '(directo)'; break;
    case 'GBX': conversion = `(/100×${forex.gbpToEur.toFixed(4)})`; break;
    case 'GBP': conversion = `(×${forex.gbpToEur.toFixed(4)})`; break;
    case 'USD': conversion = `(×${forex.usdToEur.toFixed(4)})`; break;
    case 'HKD': conversion = `(×${forex.hkdToEur.toFixed(4)})`; break;
  }
  return `[price-service] ${ticker} | raw=${rawPrice} ${currency} | → ${priceEur.toFixed(2)}€ ${conversion}`;
}

// ---------------------------------------------------------------------------
// Yahoo Finance — individual ticker, sin caché
// ---------------------------------------------------------------------------

interface YahooChartMeta {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{ meta?: YahooChartMeta }>;
  };
}

interface PriceData {
  price: number;
  changePercent: number | null;
}

async function fetchYahooSingle(
  ticker: string,
  currency: 'EUR' | 'GBP' | 'GBX' | 'USD' | 'HKD',
  forex: ForexRates,
): Promise<PriceData | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Arkhos/1.0)' },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as YahooChartResponse;
  const meta = data?.chart?.result?.[0]?.meta;
  const rawPrice = meta?.regularMarketPrice;
  if (!rawPrice || rawPrice <= 0) return null;

  const priceEur = convertToEur(rawPrice, currency, ticker, forex);
  if (priceEur === null || !Number.isFinite(priceEur)) return null;

  console.log(formatPriceLog(ticker, rawPrice, currency, priceEur, forex));

  return {
    price: priceEur,
    changePercent: meta?.regularMarketChangePercent ?? null,
  };
}

// ---------------------------------------------------------------------------
// Finnhub — acciones USA, sin caché
// ---------------------------------------------------------------------------

interface FinnhubQuote {
  c: number;
  dp: number;
}

async function fetchFinnhubSingle(
  ticker: string,
  usdToEur: number,
  forex: ForexRates,
): Promise<PriceData | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) return null;

  const data = (await res.json()) as FinnhubQuote;
  if (!data.c || data.c <= 0) return null;

  const priceEur = data.c * usdToEur;
  console.log(formatPriceLog(ticker, data.c, 'USD', priceEur, forex));

  return {
    price: priceEur,
    changePercent: Number.isFinite(data.dp) ? data.dp : null,
  };
}

// ---------------------------------------------------------------------------
// Main export: fetchAllTRPrices — sin Redis, sin caché
// ---------------------------------------------------------------------------

export async function fetchAllTRPrices(): Promise<{
  prices: PriceResult[];
  forex: ForexRates;
  errors: string[];
  debug: PriceDebugInfo;
}> {
  const errors: string[] = [];
  const now = new Date().toISOString();

  // 1. Forex en tiempo real (sin caché)
  const forex = await getForexRates(errors);

  // 2. Agrupar ISINs por fuente
  const yahooEntries: Array<[string, string, 'EUR' | 'GBP' | 'GBX' | 'USD' | 'HKD']> = [];
  const finnhubEntries: Array<[string, string]> = [];
  const yahooHkEntries: Array<[string, string, 'HKD']> = [];

  for (const [isin, cfg] of Object.entries(TICKER_CONFIG)) {
    if (cfg.source === 'yahoo') {
      yahooEntries.push([isin, cfg.ticker, cfg.currency]);
    } else if (cfg.source === 'finnhub') {
      finnhubEntries.push([isin, cfg.ticker]);
    } else {
      yahooHkEntries.push([isin, cfg.ticker, 'HKD']);
    }
  }

  // 3. Lanzar todas las llamadas en paralelo con Promise.allSettled
  const allPromises = [
    ...yahooEntries.map(([, ticker, currency]) =>
      fetchYahooSingle(ticker, currency, forex),
    ),
    ...finnhubEntries.map(([, ticker]) =>
      fetchFinnhubSingle(ticker, forex.usdToEur, forex),
    ),
    ...yahooHkEntries.map(([, ticker]) =>
      fetchYahooSingle(ticker, 'HKD', forex),
    ),
  ];

  const settled = await Promise.allSettled(allPromises);

  // 4. Reconstruir resultados por grupo
  const prices: PriceResult[] = [];
  const missingIsins: string[] = [];
  const tickersTried: Record<string, string> = {};

  let idx = 0;

  // Yahoo EU
  for (const [isin, ticker, currency] of yahooEntries) {
    const r = settled[idx++];
    const data = r.status === 'fulfilled' ? r.value : null;
    tickersTried[isin] = data ? ticker : `${ticker} (failed)`;
    if (data) {
      prices.push({ isin, priceEur: data.price, changePercent: data.changePercent, source: 'yahoo', updatedAt: now });
    } else {
      missingIsins.push(`${isin}→${ticker}(${currency})`);
      console.log(`[price-service] FAILED ${ticker} (${isin})`);
    }
  }

  // Finnhub
  for (const [isin, ticker] of finnhubEntries) {
    const r = settled[idx++];
    const data = r.status === 'fulfilled' ? r.value : null;
    tickersTried[isin] = data ? ticker : `${ticker} (failed)`;
    if (data) {
      prices.push({ isin, priceEur: data.price, changePercent: data.changePercent, source: 'finnhub', updatedAt: now });
    } else {
      missingIsins.push(`${isin}→${ticker}(USD)`);
      console.log(`[price-service] FAILED ${ticker} (${isin})`);
    }
  }

  // Yahoo HK
  for (const [isin, ticker] of yahooHkEntries) {
    const r = settled[idx++];
    const data = r.status === 'fulfilled' ? r.value : null;
    tickersTried[isin] = data ? ticker : `${ticker} (failed)`;
    if (data) {
      prices.push({ isin, priceEur: data.price, changePercent: data.changePercent, source: 'yahoo_hk', updatedAt: now });
    } else {
      missingIsins.push(`${isin}→${ticker}(HKD)`);
      console.log(`[price-service] FAILED ${ticker} (${isin})`);
    }
  }

  const yahooEuCount = prices.filter((p) => p.source === 'yahoo').length;
  const finnhubCount = prices.filter((p) => p.source === 'finnhub').length;
  const yahooHkCount = prices.filter((p) => p.source === 'yahoo_hk').length;

  console.log(`[price-service] Total: ${prices.length} precios — yahoo=${yahooEuCount} finnhub=${finnhubCount} hk=${yahooHkCount} missing=${missingIsins.length}`);
  if (errors.length) console.log('[price-service] Errors:', errors);

  const debug: PriceDebugInfo = {
    yahoo_eu_count: yahooEuCount,
    finnhub_count: finnhubCount,
    yahoo_hk_count: yahooHkCount,
    missing_isins: missingIsins,
    tickers_tried: tickersTried,
  };

  return { prices, forex, errors, debug };
}
