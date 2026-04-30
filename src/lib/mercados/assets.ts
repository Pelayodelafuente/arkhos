import { fetchFREDSeries } from './fred';
import { type CachedMetric, getCachedMetric, setCachedMetric } from './cache';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface CryptoData {
  bitcoin: {
    price: number;
    change24h: number;
    changePct24h: number;
    marketCap: number;
    volume24h: number;
    history: Array<{ date: string; value: number }>;
  };
  ethereum: {
    price: number;
    change24h: number;
    changePct24h: number;
    history: Array<{ date: string; value: number }>;
  };
  totalMarketCap: number;
  totalMarketCapChange24h: number;
  btcDominance: number;
  ethBtcRatio: number;
  fearGreed: number;
}

export interface CommoditiesData {
  gold: {
    price: number;
    change24h: number;
    changePct24h: number;
    history: Array<{ date: string; value: number }>;
  };
  silver: {
    price: number;
    change24h: number;
    changePct24h: number;
    history: Array<{ date: string; value: number }>;
  };
  oil: {
    price: number;
    change24h: number;
    changePct24h: number;
    history: Array<{ date: string; value: number }>;
  };
  gsr: {
    current: number;
    history: Array<{ date: string; value: number }>;
    signal: 'buy_silver' | 'buy_gold' | 'neutral';
    signalMessage: string;
  };
  realYield: {
    current: number;
    history: Array<{ date: string; value: number }>;
  };
}

export interface IndicesData {
  indices: Array<{
    id: string;
    label: string;
    ticker: string;
    price: number;
    change1d: number;
    changePct1d: number;
    changePct1m: number;
    changePct1y: number;
    history30d: Array<{ date: string; value: number }>;
  }>;
  normalizedHistory: Array<{
    date: string;
    [ticker: string]: number | string;
  }>;
}

export interface ForexData {
  pairs: Array<{
    pair: string;
    label: string;
    value: number;
    change24h: number;
    changePct24h: number;
    history: Array<{ date: string; value: number }>;
    relevance: string;
  }>;
  portfolioExposureAnalysis: {
    eurUsdRate: number;
    usdExposurePct: number;
    portfolioValueEur: number;
    impactOf10pctMove: number;
    message: string;
  };
}

export interface AssetsData {
  crypto: CryptoData;
  commodities: CommoditiesData;
  indices: IndicesData;
  forex: ForexData;
  fetchedAt: string;
  errors: string[];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function fetchYahooHistory(
  ticker: string,
  days = 365
): Promise<Array<{ date: string; value: number }>> {
  const range = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 365 ? '1y' : '2y';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Yahoo error ${res.status} for ${ticker}`);

  const json = await res.json() as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: number[] }> };
      }>;
    };
  };
  const chart = json.chart?.result?.[0];
  if (!chart) throw new Error(`No Yahoo data for ${ticker}`);

  const timestamps: number[] = chart.timestamp ?? [];
  const closes: number[] = chart.indicators?.quote?.[0]?.close ?? [];

  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      value: closes[i] as number,
    }))
    .filter((h): h is { date: string; value: number } => h.value != null && !isNaN(h.value));
}

function calcChange(history: Array<{ date: string; value: number }>) {
  const current = history[history.length - 1]?.value ?? 0;
  const prev = history[history.length - 2]?.value ?? current;
  return {
    current,
    change24h: parseFloat((current - prev).toFixed(4)),
    changePct24h: parseFloat((((current - prev) / prev) * 100).toFixed(2)),
  };
}

// ─── CRYPTO ──────────────────────────────────────────────────────────────────

async function getCrypto(forceRefresh = false): Promise<CryptoData> {
  const cached = await getCachedMetric('CoinGecko', 'assetsCrypto', forceRefresh);
  if (cached) return cached.value as unknown as CryptoData;

  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
  }

  const [globalRes, btcHistRes, ethHistRes] = await Promise.all([
    fetch('https://api.coingecko.com/api/v3/global', { headers, next: { revalidate: 0 } }),
    fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90&interval=daily', { headers, next: { revalidate: 0 } }),
    fetch('https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=90&interval=daily', { headers, next: { revalidate: 0 } }),
  ]);

  const [globalJson, btcHistJson, ethHistJson] = await Promise.all([
    globalRes.json() as Promise<{ data: { total_market_cap?: { usd?: number }; total_volume?: { usd?: number }; market_cap_change_percentage_24h_usd?: number; market_cap_percentage?: { btc?: number } } }>,
    btcHistRes.json() as Promise<{ prices: [number, number][] }>,
    ethHistRes.json() as Promise<{ prices: [number, number][] }>,
  ]);

  const g = globalJson.data;

  const btcHistory = btcHistJson.prices.map(([ts, p]) => ({
    date: new Date(ts).toISOString().split('T')[0],
    value: Math.round(p),
  }));
  const ethHistory = ethHistJson.prices.map(([ts, p]) => ({
    date: new Date(ts).toISOString().split('T')[0],
    value: Math.round(p),
  }));

  const btcPrice = btcHistory[btcHistory.length - 1]?.value ?? 0;
  const btcPrev = btcHistory[btcHistory.length - 2]?.value ?? btcPrice;
  const ethPrice = ethHistory[ethHistory.length - 1]?.value ?? 0;
  const ethPrev = ethHistory[ethHistory.length - 2]?.value ?? ethPrice;

  const value: CryptoData = {
    bitcoin: {
      price: btcPrice,
      change24h: btcPrice - btcPrev,
      changePct24h: parseFloat((((btcPrice - btcPrev) / btcPrev) * 100).toFixed(2)),
      marketCap: g.total_market_cap?.usd ?? 0,
      volume24h: g.total_volume?.usd ?? 0,
      history: btcHistory,
    },
    ethereum: {
      price: ethPrice,
      change24h: ethPrice - ethPrev,
      changePct24h: parseFloat((((ethPrice - ethPrev) / ethPrev) * 100).toFixed(2)),
      history: ethHistory,
    },
    totalMarketCap: g.total_market_cap?.usd ?? 0,
    totalMarketCapChange24h: g.market_cap_change_percentage_24h_usd ?? 0,
    btcDominance: parseFloat((g.market_cap_percentage?.btc ?? 0).toFixed(1)),
    ethBtcRatio: parseFloat((ethPrice / btcPrice).toFixed(5)),
    fearGreed: 0,
  };

  await setCachedMetric('CoinGecko', 'assetsCrypto', value as unknown as CachedMetric['value'], 2);
  return value;
}

// ─── COMMODITIES ─────────────────────────────────────────────────────────────

async function getCommodities(forceRefresh = false): Promise<CommoditiesData> {
  const cached = await getCachedMetric('Yahoo', 'assetsCommodities', forceRefresh);
  if (cached) return cached.value as unknown as CommoditiesData;

  const [goldHist, silverHist, oilHist, tipsHist] = await Promise.all([
    fetchYahooHistory('GC=F', 365),
    fetchYahooHistory('SI=F', 365),
    fetchYahooHistory('CL=F', 90),
    fetchFREDSeries('DFII10', 365),
  ]);

  const gold = calcChange(goldHist);
  const silver = calcChange(silverHist);
  const oil = calcChange(oilHist);

  const silverMap = new Map(silverHist.map(h => [h.date, h.value]));
  const gsrHistory = goldHist
    .filter(h => silverMap.has(h.date) && (silverMap.get(h.date) ?? 0) > 0)
    .map(h => ({
      date: h.date,
      value: parseFloat((h.value / silverMap.get(h.date)!).toFixed(2)),
    }))
    .slice(-180);

  const currentGSR = parseFloat((gold.current / silver.current).toFixed(2));
  const gsrSignal: CommoditiesData['gsr']['signal'] =
    currentGSR > 85 ? 'buy_silver' :
    currentGSR < 55 ? 'buy_gold' : 'neutral';

  const gsrMessages: Record<CommoditiesData['gsr']['signal'], string> = {
    buy_silver: `GSR en ${currentGSR}: La plata está históricamente barata vs el oro. Con IGLN y ISLN en cartera, considera aumentar posición en plata (ISLN).`,
    buy_gold: `GSR en ${currentGSR}: El oro está históricamente barato vs la plata. Considera aumentar posición en oro (IGLN).`,
    neutral: `GSR en ${currentGSR}: Ratio dentro del rango normal (55-85). No hay señal clara de rotación entre metales.`,
  };

  const realYieldCurrent = tipsHist[tipsHist.length - 1]?.value ?? 0;

  const value: CommoditiesData = {
    gold: { price: Math.round(gold.current), change24h: gold.change24h, changePct24h: gold.changePct24h, history: goldHist.slice(-90) },
    silver: { price: parseFloat(silver.current.toFixed(2)), change24h: silver.change24h, changePct24h: silver.changePct24h, history: silverHist.slice(-90) },
    oil: { price: parseFloat(oil.current.toFixed(2)), change24h: oil.change24h, changePct24h: oil.changePct24h, history: oilHist.slice(-60) },
    gsr: {
      current: currentGSR,
      history: gsrHistory,
      signal: gsrSignal,
      signalMessage: gsrMessages[gsrSignal],
    },
    realYield: {
      current: realYieldCurrent,
      history: tipsHist.slice(-180),
    },
  };

  await setCachedMetric('Yahoo', 'assetsCommodities', value as unknown as CachedMetric['value'], 6);
  return value;
}

// ─── ÍNDICES ─────────────────────────────────────────────────────────────────

const INDICES_CONFIG = [
  { id: 'sp500',     label: 'S&P 500',    ticker: '^GSPC' },
  { id: 'nasdaq',    label: 'NASDAQ',     ticker: '^IXIC' },
  { id: 'msciWorld', label: 'MSCI World', ticker: 'IWDA.AS' },
  { id: 'dax',       label: 'DAX',        ticker: '^GDAXI' },
  { id: 'eurostoxx', label: 'Euro Stoxx', ticker: '^STOXX50E' },
  { id: 'emerging',  label: 'Emergentes', ticker: 'VFEM.AS' },
];

async function getIndices(forceRefresh = false): Promise<IndicesData> {
  const cached = await getCachedMetric('Yahoo', 'assetsIndices', forceRefresh);
  if (cached) return cached.value as unknown as IndicesData;

  const histories = await Promise.allSettled(
    INDICES_CONFIG.map(idx => fetchYahooHistory(idx.ticker, 365))
  );

  const indices = INDICES_CONFIG.map((config, i) => {
    const result = histories[i];
    if (result.status === 'rejected') {
      return { id: config.id, label: config.label, ticker: config.ticker, price: 0, change1d: 0, changePct1d: 0, changePct1m: 0, changePct1y: 0, history30d: [] };
    }
    const hist = result.value;
    const current = hist[hist.length - 1]?.value ?? 0;
    const prev1d = hist[hist.length - 2]?.value ?? current;
    const prev1m = hist[Math.max(0, hist.length - 22)]?.value ?? current;
    const prev1y = hist[0]?.value ?? current;

    return {
      id: config.id,
      label: config.label,
      ticker: config.ticker,
      price: parseFloat(current.toFixed(2)),
      change1d: parseFloat((current - prev1d).toFixed(2)),
      changePct1d: parseFloat((((current - prev1d) / prev1d) * 100).toFixed(2)),
      changePct1m: parseFloat((((current - prev1m) / prev1m) * 100).toFixed(2)),
      changePct1y: parseFloat((((current - prev1y) / prev1y) * 100).toFixed(2)),
      history30d: hist.slice(-30),
    };
  });

  const allDates = new Set<string>();
  const histMaps: Map<string, number>[] = [];

  INDICES_CONFIG.forEach((_, i) => {
    const result = histories[i];
    if (result.status === 'fulfilled') {
      const m = new Map(result.value.map(h => [h.date, h.value]));
      histMaps.push(m);
      result.value.forEach(h => allDates.add(h.date));
    } else {
      histMaps.push(new Map());
    }
  });

  const sortedDates = Array.from(allDates).sort().slice(-252);

  const baseValues = INDICES_CONFIG.map((_, i) => {
    for (const date of sortedDates) {
      const v = histMaps[i]?.get(date);
      if (v) return v;
    }
    return 1;
  });

  const normalizedHistory: IndicesData['normalizedHistory'] = sortedDates.map(date => {
    const point: { date: string; [key: string]: number | string } = { date };
    INDICES_CONFIG.forEach((config, i) => {
      const v = histMaps[i]?.get(date);
      if (v && baseValues[i]) {
        point[config.id] = parseFloat(((v / baseValues[i]) * 100).toFixed(2));
      }
    });
    return point;
  });

  const value: IndicesData = { indices, normalizedHistory };
  await setCachedMetric('Yahoo', 'assetsIndices', value as unknown as CachedMetric['value'], 6);
  return value;
}

// ─── FOREX ───────────────────────────────────────────────────────────────────

const FOREX_CONFIG = [
  {
    pair: 'EUR/USD',
    ticker: 'EURUSD=X',
    label: 'Euro / Dólar',
    relevance: 'Tu cartera tiene ~85% de exposición en USD. Este par define cuánto valen tus inversiones en euros reales.',
  },
  {
    pair: 'USD/JPY',
    ticker: 'JPY=X',
    label: 'Dólar / Yen',
    relevance: 'El yen es indicador de riesgo global. JPY fuerte = inversores huyendo al refugio = señal de cautela.',
  },
  {
    pair: 'EUR/GBP',
    ticker: 'EURGBP=X',
    label: 'Euro / Libra',
    relevance: 'Informativo. Impacto en ETFs con exposición UK.',
  },
  {
    pair: 'DXY',
    ticker: 'DX-Y.NYB',
    label: 'Índice Dólar',
    relevance: 'Fortaleza general del USD. DXY alto = presión sobre crypto, oro y activos emergentes.',
  },
];

async function getForex(forceRefresh = false): Promise<ForexData> {
  const cached = await getCachedMetric('Yahoo', 'assetsForex', forceRefresh);
  if (cached) return cached.value as unknown as ForexData;

  const histories = await Promise.allSettled(
    FOREX_CONFIG.map(f => fetchYahooHistory(f.ticker, 180))
  );

  const pairs = FOREX_CONFIG.map((config, i) => {
    const result = histories[i];
    if (result.status === 'rejected') {
      return { pair: config.pair, label: config.label, value: 0, change24h: 0, changePct24h: 0, history: [], relevance: config.relevance };
    }
    const hist = result.value;
    const { current, change24h, changePct24h } = calcChange(hist);
    return {
      pair: config.pair,
      label: config.label,
      value: parseFloat(current.toFixed(4)),
      change24h: parseFloat(change24h.toFixed(4)),
      changePct24h: parseFloat(changePct24h.toFixed(2)),
      history: hist.slice(-90),
      relevance: config.relevance,
    };
  });

  const eurUsdRate = pairs.find(p => p.pair === 'EUR/USD')?.value ?? 1.1;
  const portfolioValueEur = 39754;
  const usdExposurePct = 85;
  const usdValueInEur = portfolioValueEur * (usdExposurePct / 100);
  const impactOf10pctMove = parseFloat((usdValueInEur * 0.10).toFixed(0));

  const portfolioExposureAnalysis = {
    eurUsdRate,
    usdExposurePct,
    portfolioValueEur,
    impactOf10pctMove,
    message: `Con EUR/USD en ${eurUsdRate}, tu exposición en USD (~${usdExposurePct}% de cartera) vale aprox. €${usdValueInEur.toLocaleString('es-ES')}. Un movimiento del 10% en el par supone ±€${impactOf10pctMove.toLocaleString('es-ES')} en tu patrimonio, independientemente de cómo evolucionen los activos.`,
  };

  const value: ForexData = { pairs, portfolioExposureAnalysis };
  await setCachedMetric('Yahoo', 'assetsForex', value as unknown as CachedMetric['value'], 6);
  return value;
}

// ─── EXPORT PRINCIPAL ────────────────────────────────────────────────────────

export async function fetchAssetsData(forceRefresh = false): Promise<AssetsData> {
  const errors: string[] = [];

  const results = await Promise.allSettled([
    getCrypto(forceRefresh),
    getCommodities(forceRefresh),
    getIndices(forceRefresh),
    getForex(forceRefresh),
  ]);

  function getVal<T>(r: PromiseSettledResult<T>, name: string, fallback: T): T {
    if (r.status === 'fulfilled') return r.value;
    errors.push(`${name}: ${(r.reason as Error)?.message ?? 'Error'}`);
    return fallback;
  }

  const [crypto, commodities, indices, forex] = results;

  return {
    crypto: getVal(crypto!, 'Crypto', {
      bitcoin: { price: 0, change24h: 0, changePct24h: 0, marketCap: 0, volume24h: 0, history: [] },
      ethereum: { price: 0, change24h: 0, changePct24h: 0, history: [] },
      totalMarketCap: 0, totalMarketCapChange24h: 0, btcDominance: 0, ethBtcRatio: 0, fearGreed: 0,
    }),
    commodities: getVal(commodities!, 'Commodities', {
      gold: { price: 0, change24h: 0, changePct24h: 0, history: [] },
      silver: { price: 0, change24h: 0, changePct24h: 0, history: [] },
      oil: { price: 0, change24h: 0, changePct24h: 0, history: [] },
      gsr: { current: 0, history: [], signal: 'neutral', signalMessage: '' },
      realYield: { current: 0, history: [] },
    }),
    indices: getVal(indices!, 'Índices', { indices: [], normalizedHistory: [] }),
    forex: getVal(forex!, 'Forex', {
      pairs: [],
      portfolioExposureAnalysis: { eurUsdRate: 1.1, usdExposurePct: 85, portfolioValueEur: 0, impactOf10pctMove: 0, message: '' },
    }),
    fetchedAt: new Date().toISOString(),
    errors,
  };
}
