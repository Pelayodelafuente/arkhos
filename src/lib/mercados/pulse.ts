import { getCachedMetric, setCachedMetric } from './cache';
import type { CachedMetric } from './cache';
import { PULSE_METRICS } from './constants';
import { fetchFREDSeries } from './fred';

// ─── FRED ────────────────────────────────────────────────────────────────────

async function getVIX(forceRefresh = false): Promise<CachedMetric['value']> {
  const cached = await getCachedMetric('FRED', 'vix', forceRefresh);
  if (cached) return cached.value;

  const history = await fetchFREDSeries('VIXCLS', 30);
  const latest = history[history.length - 1];
  const prev = history[history.length - 2];

  const value: CachedMetric['value'] = {
    current: latest.value,
    change24h: latest.value - prev.value,
    changePct24h: ((latest.value - prev.value) / prev.value) * 100,
    history: history.slice(-14),
  };

  await setCachedMetric('FRED', 'vix', value, PULSE_METRICS.vix.ttlHours);
  return value;
}

async function getUS10Y(forceRefresh = false): Promise<CachedMetric['value']> {
  const cached = await getCachedMetric('FRED', 'us10y', forceRefresh);
  if (cached) return cached.value;

  const history = await fetchFREDSeries('DGS10', 30);
  const latest = history[history.length - 1];
  const prev = history[history.length - 2];

  const absDiff = parseFloat((latest.value - prev.value).toFixed(3));
  const value: CachedMetric['value'] = {
    current: latest.value,
    change24h: absDiff,
    changePct24h: absDiff,
    history: history.slice(-14),
  };

  await setCachedMetric('FRED', 'us10y', value, PULSE_METRICS.us10y.ttlHours);
  return value;
}

async function getM2(forceRefresh = false): Promise<CachedMetric['value']> {
  const cached = await getCachedMetric('FRED', 'm2', forceRefresh);
  if (cached) return cached.value;

  const history = await fetchFREDSeries('M2SL', 24);
  const latest = history[history.length - 1];
  const prev = history[history.length - 2];
  const currentT = latest.value / 1000;

  const value: CachedMetric['value'] = {
    current: parseFloat(currentT.toFixed(2)),
    change24h: (latest.value - prev.value) / 1000,
    changePct24h: ((latest.value - prev.value) / prev.value) * 100,
    history: history.slice(-12).map((h) => ({ ...h, value: h.value / 1000 })),
  };

  await setCachedMetric('FRED', 'm2', value, PULSE_METRICS.m2.ttlHours);
  return value;
}

// ─── ALTERNATIVE.ME ──────────────────────────────────────────────────────────

async function getFearGreed(forceRefresh = false): Promise<CachedMetric['value']> {
  const cached = await getCachedMetric('alternative.me', 'fearGreed', forceRefresh);
  if (cached) return cached.value;

  const res = await fetch('https://api.alternative.me/fng/?limit=14&format=json', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Fear & Greed API error ${res.status}`);

  const json = (await res.json()) as {
    data: Array<{ value: string; value_classification: string; timestamp: string }>;
  };
  const entries = json.data;

  const latest = entries[0];
  const prev = entries[1];
  const currentVal = parseInt(latest.value);
  const prevVal = parseInt(prev.value);

  const value: CachedMetric['value'] = {
    current: currentVal,
    change24h: currentVal - prevVal,
    changePct24h: ((currentVal - prevVal) / prevVal) * 100,
    label: latest.value_classification,
    history: [...entries].reverse().map((e) => ({
      date: new Date(parseInt(e.timestamp) * 1000).toISOString().split('T')[0],
      value: parseInt(e.value),
    })),
  };

  await setCachedMetric('alternative.me', 'fearGreed', value, PULSE_METRICS.fearGreed.ttlHours);
  return value;
}

// ─── YAHOO FINANCE ────────────────────────────────────────────────────────────

async function fetchYahooQuote(ticker: string): Promise<{
  current: number;
  change: number;
  changePct: number;
  history: Array<{ date: string; value: number }>;
}> {
  const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`;
  const res = await fetch(quoteUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Yahoo Finance error ${res.status} for ${ticker}`);

  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: number[] }> };
      }>;
    };
  };
  const chart = json.chart?.result?.[0];
  if (!chart) throw new Error(`No data for ${ticker}`);

  const timestamps: number[] = chart.timestamp ?? [];
  const closes: number[] = chart.indicators?.quote?.[0]?.close ?? [];

  const history = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      value: closes[i],
    }))
    .filter((h): h is { date: string; value: number } => h.value != null && !isNaN(h.value));

  const current = history[history.length - 1]?.value ?? 0;
  const prevVal = history[history.length - 2]?.value ?? current;

  return {
    current,
    change: current - prevVal,
    changePct: ((current - prevVal) / prevVal) * 100,
    history: history.slice(-14),
  };
}

async function getDXY(forceRefresh = false): Promise<CachedMetric['value']> {
  const cached = await getCachedMetric('Yahoo', 'dxy', forceRefresh);
  if (cached) return cached.value;

  const data = await fetchYahooQuote('DX-Y.NYB');
  const value: CachedMetric['value'] = {
    current: parseFloat(data.current.toFixed(2)),
    change24h: data.change,
    changePct24h: data.changePct,
    history: data.history,
  };

  await setCachedMetric('Yahoo', 'dxy', value, PULSE_METRICS.dxy.ttlHours);
  return value;
}

async function getGold(forceRefresh = false): Promise<CachedMetric['value']> {
  const cached = await getCachedMetric('Yahoo', 'gold', forceRefresh);
  if (cached) return cached.value;

  const data = await fetchYahooQuote('GC=F');
  const value: CachedMetric['value'] = {
    current: Math.round(data.current),
    change24h: data.change,
    changePct24h: data.changePct,
    history: data.history,
  };

  await setCachedMetric('Yahoo', 'gold', value, PULSE_METRICS.gold.ttlHours);
  return value;
}

// ─── EXCHANGE RATE API ────────────────────────────────────────────────────────

async function getEURUSD(forceRefresh = false): Promise<CachedMetric['value']> {
  const cached = await getCachedMetric('ExchangeRate', 'eurusd', forceRefresh);
  if (cached) return cached.value;

  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/EUR/USD`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`ExchangeRate API error ${res.status}`);

  const json = (await res.json()) as { conversion_rate: number };
  const current = json.conversion_rate;

  let history: Array<{ date: string; value: number }> = [];
  try {
    const yahooData = await fetchYahooQuote('EURUSD=X');
    history = yahooData.history;
  } catch {
    history = [{ date: new Date().toISOString().split('T')[0], value: current }];
  }

  const prev = history[history.length - 2]?.value ?? current;
  const value: CachedMetric['value'] = {
    current: parseFloat(current.toFixed(4)),
    change24h: current - prev,
    changePct24h: ((current - prev) / prev) * 100,
    history,
  };

  await setCachedMetric('ExchangeRate', 'eurusd', value, PULSE_METRICS.eurusd.ttlHours);
  return value;
}

// ─── COINGECKO ────────────────────────────────────────────────────────────────

async function getBitcoin(forceRefresh = false): Promise<CachedMetric['value']> {
  const cached = await getCachedMetric('CoinGecko', 'bitcoin', forceRefresh);
  if (cached) return cached.value;

  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
  }

  const res = await fetch(
    'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=14&interval=daily',
    { headers, cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`CoinGecko error ${res.status}`);

  const json = (await res.json()) as { prices: [number, number][] };
  const prices = json.prices;

  const history = prices.map(([ts, price]) => ({
    date: new Date(ts).toISOString().split('T')[0],
    value: Math.round(price),
  }));

  const current = history[history.length - 1].value;
  const prev = history[history.length - 2].value;

  const value: CachedMetric['value'] = {
    current,
    change24h: current - prev,
    changePct24h: ((current - prev) / prev) * 100,
    history,
  };

  await setCachedMetric('CoinGecko', 'bitcoin', value, PULSE_METRICS.bitcoin.ttlHours);
  return value;
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────

export interface PulseData {
  vix: CachedMetric['value'];
  fearGreed: CachedMetric['value'];
  dxy: CachedMetric['value'];
  eurusd: CachedMetric['value'];
  us10y: CachedMetric['value'];
  gold: CachedMetric['value'];
  bitcoin: CachedMetric['value'];
  m2: CachedMetric['value'];
  fetchedAt: string;
  errors: string[];
}

export async function fetchPulseData(forceRefresh = false): Promise<PulseData> {
  const errors: string[] = [];

  const results = await Promise.allSettled([
    getVIX(forceRefresh),
    getFearGreed(forceRefresh),
    getDXY(forceRefresh),
    getEURUSD(forceRefresh),
    getUS10Y(forceRefresh),
    getGold(forceRefresh),
    getBitcoin(forceRefresh),
    getM2(forceRefresh),
  ]);

  const [vix, fearGreed, dxy, eurusd, us10y, gold, bitcoin, m2] = results;

  const getValue = (
    result: PromiseSettledResult<CachedMetric['value']>,
    name: string
  ): CachedMetric['value'] => {
    if (result.status === 'fulfilled') return result.value;
    errors.push(`${name}: ${(result.reason as Error)?.message ?? 'Error desconocido'}`);
    return { current: 0, change24h: 0, changePct24h: 0, history: [] };
  };

  return {
    vix: getValue(vix!, 'VIX'),
    fearGreed: getValue(fearGreed!, 'Fear & Greed'),
    dxy: getValue(dxy!, 'DXY'),
    eurusd: getValue(eurusd!, 'EUR/USD'),
    us10y: getValue(us10y!, 'US 10Y'),
    gold: getValue(gold!, 'Gold'),
    bitcoin: getValue(bitcoin!, 'Bitcoin'),
    m2: getValue(m2!, 'M2'),
    fetchedAt: new Date().toISOString(),
    errors,
  };
}
