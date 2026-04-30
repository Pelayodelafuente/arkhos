import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fetchYahooHistory } from './assets';
import { type CachedMetric, getCachedMetric, setCachedMetric } from './cache';

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _admin;
}

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface AssetClassAllocation {
  id: string;
  label: string;
  currentPct: number;
  targetPct: number;
  valueEur: number;
  deviation: number;
  needsRebalance: boolean;
}

export interface BenchmarkComparison {
  portfolioReturn1m: number;
  portfolioReturn3m: number;
  portfolioReturn1y: number;
  benchmarks: Array<{
    id: string;
    label: string;
    return1m: number;
    return3m: number;
    return1y: number;
  }>;
}

export interface CorrelationMatrix {
  assets: string[];
  matrix: number[][];
  interpretation: string;
}

export interface RebalanceAlert {
  assetClass: string;
  currentPct: number;
  targetPct: number;
  deviation: number;
  action: 'reduce' | 'increase';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface PortfolioMarketData {
  assetAllocation: AssetClassAllocation[];
  totalValueEur: number;
  benchmarkComparison: BenchmarkComparison;
  correlationMatrix: CorrelationMatrix;
  rebalanceAlerts: RebalanceAlert[];
  riskMetrics: {
    estimatedBeta: number;
    usdExposurePct: number;
    concentrationRisk: string;
    diversificationScore: number;
  };
  fetchedAt: string;
  errors: string[];
}

// ─── ASSET ALLOCATION ────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  etf_index:     'etfs_index',
  etf_thematic:  'etfs_thematic',
  etf_bond:      'bonds',
  etf_commodity: 'commodities',
  stock_us:      'stocks_us',
  stock_eu:      'stocks_eu',
  stock_asia:    'stocks_asia',
  fund:          'funds',
  crypto:        'crypto',
  p2p:           'p2p',
  cash:          'cash',
};

const TARGET_ALLOCATION: Record<string, { label: string; targetPct: number }> = {
  etfs_index:    { label: 'ETFs Índice',    targetPct: 45 },
  etfs_thematic: { label: 'ETFs Temáticos', targetPct: 10 },
  stocks_us:     { label: 'Acciones USA',   targetPct: 20 },
  bonds:         { label: 'Renta Fija',     targetPct: 5  },
  commodities:   { label: 'Commodities',    targetPct: 5  },
  stocks_eu:     { label: 'Acciones EU',    targetPct: 3  },
  stocks_asia:   { label: 'Acciones Asia',  targetPct: 4  },
  funds:         { label: 'Fondos',         targetPct: 5  },
  crypto:        { label: 'Crypto',         targetPct: 3  },
  p2p:           { label: 'P2P',            targetPct: 0  },
  cash:          { label: 'Efectivo',       targetPct: 0  },
};

async function getAssetAllocation(userId: string): Promise<{
  allocation: AssetClassAllocation[];
  totalValueEur: number;
}> {
  const admin = getAdmin();
  if (!admin) return { allocation: [], totalValueEur: 0 };

  const [assetsResult, cryptoResult] = await Promise.all([
    admin
      .from('portfolio_assets')
      .select('category, current_quantity, current_price_eur, total_invested')
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('category', 'crypto'), // crypto se lee de crypto_assets
    admin
      .from('crypto_assets')
      .select('current_balance, current_price_eur, total_invested_eur')
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);

  const grouped: Record<string, number> = Object.fromEntries(
    Object.keys(TARGET_ALLOCATION).map(k => [k, 0])
  );

  for (const row of assetsResult.data ?? []) {
    const bucket = CATEGORY_MAP[row.category as string] ?? 'cash';
    const value =
      row.current_price_eur != null && row.current_quantity != null
        ? (row.current_quantity as number) * (row.current_price_eur as number)
        : (row.total_invested as number) ?? 0;
    grouped[bucket] = (grouped[bucket] ?? 0) + value;
  }

  const cryptoTotal = (cryptoResult.data ?? []).reduce((sum, row) => {
    const v =
      row.current_price_eur != null && row.current_balance != null
        ? (row.current_balance as number) * (row.current_price_eur as number)
        : (row.total_invested_eur as number) ?? 0;
    return sum + v;
  }, 0);
  grouped.crypto = (grouped.crypto ?? 0) + cryptoTotal;

  const totalValueEur = Object.values(grouped).reduce((a, b) => a + b, 0);

  const allocation: AssetClassAllocation[] = Object.entries(grouped)
    .filter(([, v]) => {
      const target = TARGET_ALLOCATION[_k(v)] ?? { targetPct: 0 };
      void target;
      return true; // include all
    })
    .map(([id, valueEur]) => {
      const target = TARGET_ALLOCATION[id] ?? { label: id, targetPct: 0 };
      const currentPct =
        totalValueEur > 0
          ? parseFloat(((valueEur / totalValueEur) * 100).toFixed(1))
          : 0;
      const deviation = parseFloat((currentPct - target.targetPct).toFixed(1));
      return {
        id,
        label: target.label,
        currentPct,
        targetPct: target.targetPct,
        valueEur: parseFloat(valueEur.toFixed(0)),
        deviation,
        needsRebalance: Math.abs(deviation) > 3,
      };
    })
    .filter(a => a.valueEur > 0 || a.targetPct > 0)
    .sort((a, b) => b.valueEur - a.valueEur);

  return { allocation, totalValueEur };
}

// helper dummy — unused at runtime, silences linter for the filter above
function _k(_v: number): string { return ''; }

// ─── BENCHMARKS ──────────────────────────────────────────────────────────────

async function getBenchmarkComparison(forceRefresh = false): Promise<BenchmarkComparison> {
  const cached = await getCachedMetric('Yahoo', 'portfolioBenchmarks', forceRefresh);
  if (cached) return cached.value as unknown as BenchmarkComparison;

  const BENCHMARKS = [
    { id: 'sp500',     label: 'S&P 500',    ticker: '^GSPC' },
    { id: 'msciWorld', label: 'MSCI World', ticker: 'IWDA.AS' },
    { id: 'nasdaq',    label: 'NASDAQ',     ticker: '^IXIC' },
  ];

  const histories = await Promise.allSettled(
    BENCHMARKS.map(b => fetchYahooHistory(b.ticker, 400))
  );

  function pctReturn(hist: Array<{ date: string; value: number }>, lookback: number): number {
    const current = hist[hist.length - 1]?.value ?? 0;
    const prev = hist[Math.max(0, hist.length - lookback)]?.value ?? current;
    if (!prev) return 0;
    return parseFloat((((current - prev) / prev) * 100).toFixed(2));
  }

  const benchmarks = BENCHMARKS.map((b, i) => {
    const result = histories[i];
    if (result.status === 'rejected')
      return { id: b.id, label: b.label, return1m: 0, return3m: 0, return1y: 0 };
    const hist = result.value;
    return {
      id: b.id,
      label: b.label,
      return1m: pctReturn(hist, 22),
      return3m: pctReturn(hist, 66),
      return1y: pctReturn(hist, 252),
    };
  });

  const msci = benchmarks.find(b => b.id === 'msciWorld');
  const sp500 = benchmarks.find(b => b.id === 'sp500');

  const est = (k: 'return1m' | 'return3m' | 'return1y') =>
    parseFloat((
      0.55 * (msci?.[k] ?? 0) +
      0.20 * (sp500?.[k] ?? 0) +
      0.13 * (sp500?.[k] ?? 0) * 1.1
    ).toFixed(2));

  const value: BenchmarkComparison = {
    portfolioReturn1m: est('return1m'),
    portfolioReturn3m: est('return3m'),
    portfolioReturn1y: est('return1y'),
    benchmarks,
  };

  await setCachedMetric('Yahoo', 'portfolioBenchmarks', value as unknown as CachedMetric['value'], 12);
  return value;
}

// ─── CORRELACIONES ───────────────────────────────────────────────────────────

async function getCorrelationMatrix(forceRefresh = false): Promise<CorrelationMatrix> {
  const cached = await getCachedMetric('Yahoo', 'correlationMatrix', forceRefresh);
  if (cached) return cached.value as unknown as CorrelationMatrix;

  const ASSETS = [
    { id: 'SP500',   ticker: '^GSPC' },
    { id: 'NASDAQ',  ticker: '^IXIC' },
    { id: 'Bitcoin', ticker: 'BTC-USD' },
    { id: 'Oro',     ticker: 'GC=F' },
    { id: 'Bonos',   ticker: 'AGG' },
    { id: 'EUR/USD', ticker: 'EURUSD=X' },
  ];

  const histories = await Promise.allSettled(
    ASSETS.map(a => fetchYahooHistory(a.ticker, 180))
  );

  function pearson(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
    const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
    let num = 0, da2 = 0, db2 = 0;
    for (let i = 0; i < n; i++) {
      const ea = a[i] - ma, eb = b[i] - mb;
      num += ea * eb; da2 += ea * ea; db2 += eb * eb;
    }
    return da2 && db2 ? parseFloat((num / Math.sqrt(da2 * db2)).toFixed(2)) : 0;
  }

  const returns: number[][] = [];
  const validAssets: string[] = [];

  ASSETS.forEach((asset, i) => {
    const result = histories[i];
    if (result.status === 'rejected') return;
    const hist = result.value;
    const daily = hist.slice(1).map((h, j) => {
      const prev = hist[j].value;
      return prev > 0 ? (h.value - prev) / prev : 0;
    });
    if (daily.length > 30) {
      returns.push(daily);
      validAssets.push(asset.id);
    }
  });

  const matrix: number[][] = validAssets.map((_, i) =>
    validAssets.map((_, j) => (i === j ? 1 : pearson(returns[i]!, returns[j]!)))
  );

  const btcIdx = validAssets.indexOf('Bitcoin');
  const spIdx = validAssets.indexOf('SP500');
  const goldIdx = validAssets.indexOf('Oro');
  const bondsIdx = validAssets.indexOf('Bonos');

  let interpretation = '';
  if (btcIdx >= 0 && spIdx >= 0) {
    const c = matrix[btcIdx]![spIdx]!;
    interpretation += `Bitcoin correlaciona ${c > 0.5 ? 'fuertemente' : c > 0.3 ? 'moderadamente' : 'débilmente'} con el S&P 500 (${c}). `;
  }
  if (goldIdx >= 0 && spIdx >= 0) {
    const c = matrix[goldIdx]![spIdx]!;
    interpretation += `El oro ${Math.abs(c) < 0.2 ? 'actúa como buen diversificador' : 'muestra correlación moderada'} vs acciones (${c}). `;
  }
  if (bondsIdx >= 0 && spIdx >= 0) {
    const c = matrix[bondsIdx]![spIdx]!;
    interpretation += `Los bonos ${c < 0 ? 'cumplen su función de cobertura' : 'han perdido correlación negativa con acciones'} (${c}).`;
  }

  const value: CorrelationMatrix = { assets: validAssets, matrix, interpretation };
  await setCachedMetric('Yahoo', 'correlationMatrix', value as unknown as CachedMetric['value'], 12);
  return value;
}

// ─── REBALANCEO ──────────────────────────────────────────────────────────────

function generateRebalanceAlerts(allocation: AssetClassAllocation[]): RebalanceAlert[] {
  return allocation
    .filter(a => a.needsRebalance)
    .map(a => {
      const action: RebalanceAlert['action'] = a.deviation > 0 ? 'reduce' : 'increase';
      const absDev = Math.abs(a.deviation);
      const severity: RebalanceAlert['severity'] =
        absDev > 7 ? 'critical' : absDev > 5 ? 'warning' : 'info';
      const actionText =
        action === 'reduce'
          ? `Considera reducir exposición en ${a.label} en ~${absDev.toFixed(1)}%`
          : `Considera aumentar exposición en ${a.label} en ~${absDev.toFixed(1)}%`;
      return {
        assetClass: a.label,
        currentPct: a.currentPct,
        targetPct: a.targetPct,
        deviation: a.deviation,
        action,
        message: `${actionText}. Actual: ${a.currentPct}% | Objetivo: ${a.targetPct}%`,
        severity,
      };
    })
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}

// ─── RISK METRICS ────────────────────────────────────────────────────────────

function calculateRiskMetrics(
  allocation: AssetClassAllocation[]
): PortfolioMarketData['riskMetrics'] {
  const betaByClass: Record<string, number> = {
    etfs_index:    1.0,
    etfs_thematic: 1.2,
    stocks_us:     1.3,
    bonds:         0.1,
    commodities:   0.3,
    stocks_eu:     1.0,
    stocks_asia:   1.1,
    funds:         0.8,
    crypto:        1.8,
    p2p:           0.05,
    cash:          0.0,
  };

  const estimatedBeta = parseFloat(
    allocation
      .reduce((sum, a) => sum + (a.currentPct / 100) * (betaByClass[a.id] ?? 1.0), 0)
      .toFixed(2)
  );

  const usdBuckets = ['etfs_index', 'etfs_thematic', 'stocks_us', 'crypto'];
  const usdExposurePct = parseFloat(
    allocation.filter(a => usdBuckets.includes(a.id)).reduce((s, a) => s + a.currentPct, 0).toFixed(1)
  );

  const numClasses = allocation.filter(a => a.currentPct > 1).length;
  const maxDev = allocation.length ? Math.max(...allocation.map(a => Math.abs(a.deviation))) : 0;
  const diversificationScore = Math.min(
    100,
    Math.round((numClasses / Object.keys(TARGET_ALLOCATION).length) * 50 + Math.max(0, 50 - maxDev * 5))
  );

  const top = allocation[0];
  const concentrationRisk =
    top && top.currentPct > 70
      ? `Alta concentración en ${top.label} (${top.currentPct}%)`
      : diversificationScore > 70
      ? 'Buena diversificación entre clases de activos'
      : 'Diversificación moderada — revisa los pesos';

  return { estimatedBeta, usdExposurePct, concentrationRisk, diversificationScore };
}

// ─── EXPORT PRINCIPAL ────────────────────────────────────────────────────────

export async function fetchPortfolioMarketData(
  userId: string,
  forceRefresh = false
): Promise<PortfolioMarketData> {
  const errors: string[] = [];

  const [allocationResult, benchmarkResult, correlationResult] = await Promise.allSettled([
    getAssetAllocation(userId),
    getBenchmarkComparison(forceRefresh),
    getCorrelationMatrix(forceRefresh),
  ]);

  const { allocation, totalValueEur } =
    allocationResult.status === 'fulfilled'
      ? allocationResult.value
      : (errors.push(`Allocation: ${String((allocationResult as PromiseRejectedResult).reason?.message ?? 'Error')}`),
         { allocation: [], totalValueEur: 0 });

  const benchmarkComparison =
    benchmarkResult.status === 'fulfilled'
      ? benchmarkResult.value
      : (errors.push(`Benchmarks: ${String((benchmarkResult as PromiseRejectedResult).reason?.message ?? 'Error')}`),
         { portfolioReturn1m: 0, portfolioReturn3m: 0, portfolioReturn1y: 0, benchmarks: [] });

  const correlationMatrix =
    correlationResult.status === 'fulfilled'
      ? correlationResult.value
      : (errors.push(`Correlaciones: ${String((correlationResult as PromiseRejectedResult).reason?.message ?? 'Error')}`),
         { assets: [], matrix: [], interpretation: '' });

  const rebalanceAlerts = generateRebalanceAlerts(allocation);
  const riskMetrics = calculateRiskMetrics(allocation);

  return {
    assetAllocation: allocation,
    totalValueEur,
    benchmarkComparison,
    correlationMatrix,
    rebalanceAlerts,
    riskMetrics,
    fetchedAt: new Date().toISOString(),
    errors,
  };
}
