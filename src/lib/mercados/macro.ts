import { fetchWithTimeout } from '@/lib/utils/fetch-timeout';
import { fetchFREDSeries } from './fred';
import { getCachedMetric, setCachedMetric } from './cache';

export interface YieldCurvePoint {
  maturity: string;
  yield: number;
  seriesId: string;
}

export interface MacroData {
  yieldCurve: {
    points: YieldCurvePoint[];
    spread10y2y: number;
    isInverted: boolean;
    history: Array<{ date: string; value: number }>;
  };
  fedFunds: {
    current: number;
    history: Array<{ date: string; value: number }>;
    nextMeetingApprox: string;
  };
  cpi: {
    current: number;
    history: Array<{ date: string; value: number }>;
    vsTarget: number;
  };
  pce: {
    current: number;
    history: Array<{ date: string; value: number }>;
  };
  m2: {
    current: number;
    yoyChange: number;
    history: Array<{ date: string; value: number }>;
    btcHistory: Array<{ date: string; value: number }>;
  };
  fedBalance: {
    current: number;
    history: Array<{ date: string; value: number }>;
    trend: 'expanding' | 'contracting' | 'stable';
  };
  fetchedAt: string;
  errors: string[];
}

// ─── YIELD CURVE ─────────────────────────────────────────────────────────────

async function getYieldCurve(forceRefresh = false): Promise<MacroData['yieldCurve']> {
  const cached = await getCachedMetric('FRED', 'yieldCurve', forceRefresh);
  if (cached) return cached.value.raw as MacroData['yieldCurve'];

  const maturities: Array<{ maturity: string; seriesId: string }> = [
    { maturity: '3M', seriesId: 'DGS3MO' },
    { maturity: '2Y', seriesId: 'DGS2' },
    { maturity: '5Y', seriesId: 'DGS5' },
    { maturity: '10Y', seriesId: 'DGS10' },
    { maturity: '30Y', seriesId: 'DGS30' },
  ];

  const results = await Promise.all(
    maturities.map(async (m) => {
      const data = await fetchFREDSeries(m.seriesId, 5);
      return {
        maturity: m.maturity,
        seriesId: m.seriesId,
        yield: data[data.length - 1]?.value ?? 0,
      };
    })
  );

  const [hist10y, hist2y] = await Promise.all([
    fetchFREDSeries('DGS10', 800),
    fetchFREDSeries('DGS2', 800),
  ]);

  const hist2yMap = new Map(hist2y.map((h) => [h.date, h.value]));
  const spreadHistory = hist10y
    .filter((h) => hist2yMap.has(h.date))
    .map((h) => ({
      date: h.date,
      value: parseFloat((h.value - hist2yMap.get(h.date)!).toFixed(3)),
    }))
    .slice(-365);

  const us10y = results.find((r) => r.maturity === '10Y')?.yield ?? 0;
  const us2y = results.find((r) => r.maturity === '2Y')?.yield ?? 0;
  const spread = parseFloat((us10y - us2y).toFixed(3));

  const value: MacroData['yieldCurve'] = {
    points: results,
    spread10y2y: spread,
    isInverted: spread < 0,
    history: spreadHistory,
  };

  await setCachedMetric('FRED', 'yieldCurve', { current: 0, raw: value }, 6);
  return value;
}

// ─── FED FUNDS ────────────────────────────────────────────────────────────────

async function getFedFunds(forceRefresh = false): Promise<MacroData['fedFunds']> {
  const cached = await getCachedMetric('FRED', 'fedFunds', forceRefresh);
  if (cached) return cached.value.raw as MacroData['fedFunds'];

  const history = await fetchFREDSeries('FEDFUNDS', 60);
  const current = history[history.length - 1]?.value ?? 0;

  const upcomingMeetings = [
    '2025-06-17', '2025-07-29', '2025-09-16',
    '2025-10-28', '2025-12-09',
  ];
  const nextMeeting =
    upcomingMeetings.find((d) => new Date(d) > new Date()) ?? 'Por determinar';

  const value: MacroData['fedFunds'] = { current, history, nextMeetingApprox: nextMeeting };
  await setCachedMetric('FRED', 'fedFunds', { current, raw: value }, 24);
  return value;
}

// ─── CPI ──────────────────────────────────────────────────────────────────────

async function getCPI(forceRefresh = false): Promise<MacroData['cpi']> {
  const cached = await getCachedMetric('FRED', 'cpi', forceRefresh);
  if (cached) return cached.value.raw as MacroData['cpi'];

  const history = await fetchFREDSeries('CPIAUCSL', 36);

  const yoyHistory = history
    .slice(12)
    .map((h, i) => ({
      date: h.date,
      value: parseFloat((((h.value - history[i].value) / history[i].value) * 100).toFixed(2)),
    }));

  const current = yoyHistory[yoyHistory.length - 1]?.value ?? 0;

  const value: MacroData['cpi'] = {
    current,
    history: yoyHistory.slice(-24),
    vsTarget: parseFloat((current - 2.0).toFixed(2)),
  };

  await setCachedMetric('FRED', 'cpi', { current, raw: value }, 24);
  return value;
}

// ─── PCE ──────────────────────────────────────────────────────────────────────

async function getPCE(forceRefresh = false): Promise<MacroData['pce']> {
  const cached = await getCachedMetric('FRED', 'pce', forceRefresh);
  if (cached) return cached.value.raw as MacroData['pce'];

  const history = await fetchFREDSeries('PCEPILFE', 36);

  const yoyHistory = history
    .slice(12)
    .map((h, i) => ({
      date: h.date,
      value: parseFloat((((h.value - history[i].value) / history[i].value) * 100).toFixed(2)),
    }));

  const current = yoyHistory[yoyHistory.length - 1]?.value ?? 0;
  const value: MacroData['pce'] = { current, history: yoyHistory.slice(-24) };

  await setCachedMetric('FRED', 'pce', { current, raw: value }, 24);
  return value;
}

// ─── M2 + BTC ────────────────────────────────────────────────────────────────

async function getM2WithBTC(forceRefresh = false): Promise<MacroData['m2']> {
  const cached = await getCachedMetric('FRED', 'm2macro', forceRefresh);
  if (cached) return cached.value.raw as MacroData['m2'];

  const history = await fetchFREDSeries('M2SL', 60);

  const yoyLast = history[history.length - 1];
  const yoyPrev = history[history.length - 13];
  const yoyChange = yoyPrev
    ? parseFloat((((yoyLast.value - yoyPrev.value) / yoyPrev.value) * 100).toFixed(2))
    : 0;

  let btcHistory: Array<{ date: string; value: number }> = [];
  try {
    const headers: Record<string, string> = {};
    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1825&interval=monthly',
      { headers, cache: 'no-store' }
    );
    if (res.ok) {
      const json = (await res.json()) as { prices: [number, number][] };
      btcHistory = json.prices.map(([ts, price]) => ({
        date: new Date(ts).toISOString().split('T')[0].slice(0, 7),
        value: Math.round(price),
      }));
    }
  } catch {
    // BTC overlay es opcional
  }

  const currentTrillions = parseFloat((yoyLast.value / 1000).toFixed(2));
  const value: MacroData['m2'] = {
    current: currentTrillions,
    yoyChange,
    history: history.map((h) => ({ date: h.date, value: parseFloat((h.value / 1000).toFixed(2)) })),
    btcHistory,
  };

  await setCachedMetric('FRED', 'm2macro', { current: currentTrillions, raw: value }, 24);
  return value;
}

// ─── FED BALANCE SHEET ───────────────────────────────────────────────────────

async function getFedBalance(forceRefresh = false): Promise<MacroData['fedBalance']> {
  const cached = await getCachedMetric('FRED', 'fedBalance', forceRefresh);
  if (cached) return cached.value.raw as MacroData['fedBalance'];

  const history = await fetchFREDSeries('WALCL', 60);
  const current = history[history.length - 1]?.value ?? 0;
  const sixMonthsAgo = history[history.length - 26]?.value ?? current;

  const trend: MacroData['fedBalance']['trend'] =
    current > sixMonthsAgo * 1.02
      ? 'expanding'
      : current < sixMonthsAgo * 0.98
        ? 'contracting'
        : 'stable';

  const currentT = parseFloat((current / 1_000_000).toFixed(2));
  const value: MacroData['fedBalance'] = {
    current: currentT,
    history: history.map((h) => ({
      date: h.date,
      value: parseFloat((h.value / 1_000_000).toFixed(2)),
    })),
    trend,
  };

  await setCachedMetric('FRED', 'fedBalance', { current: currentT, raw: value }, 24);
  return value;
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────

export async function fetchMacroData(forceRefresh = false): Promise<MacroData> {
  const errors: string[] = [];

  const results = await Promise.allSettled([
    getYieldCurve(forceRefresh),
    getFedFunds(forceRefresh),
    getCPI(forceRefresh),
    getPCE(forceRefresh),
    getM2WithBTC(forceRefresh),
    getFedBalance(forceRefresh),
  ]);

  const [yieldCurve, fedFunds, cpi, pce, m2, fedBalance] = results;

  function getVal<T>(r: PromiseSettledResult<T>, name: string, fallback: T): T {
    if (r.status === 'fulfilled') return r.value;
    errors.push(`${name}: ${(r.reason as Error)?.message ?? 'Error'}`);
    return fallback;
  }

  return {
    yieldCurve: getVal(yieldCurve!, 'Yield Curve', {
      points: [],
      spread10y2y: 0,
      isInverted: false,
      history: [],
    }),
    fedFunds: getVal(fedFunds!, 'Fed Funds', {
      current: 0,
      history: [],
      nextMeetingApprox: '',
    }),
    cpi: getVal(cpi!, 'CPI', { current: 0, history: [], vsTarget: 0 }),
    pce: getVal(pce!, 'PCE', { current: 0, history: [] }),
    m2: getVal(m2!, 'M2', { current: 0, yoyChange: 0, history: [], btcHistory: [] }),
    fedBalance: getVal(fedBalance!, 'Fed Balance', {
      current: 0,
      history: [],
      trend: 'stable',
    }),
    fetchedAt: new Date().toISOString(),
    errors,
  };
}
