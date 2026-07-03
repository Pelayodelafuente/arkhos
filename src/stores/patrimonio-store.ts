'use client';

import { create } from 'zustand';
import type {
  InvestmentPlatform,
  PortfolioAsset,
  PortfolioTransaction,
  SavingsPlanItem,
  PortfolioSnapshot,
  PassiveIncome,
  PortfolioOverview,
  PlatformSummary,
  PlatformSlug,
  AllocationSlice,
  PLBarItem,
  PassiveIncomeBarItem,
  EvolutionPoint,
  AssetCategory,
} from '@/types/patrimonio';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/patrimonio';

interface PatrimonioStore {
  // State
  // `onboarding`: resuelto server-side por `getAppData` (Patrimonio.hasPlatforms)
  // y volcado aquí por `hydrateAllStores` — decide si `PatrimonioGate` renderiza
  // `PatrimonioOnboarding` o `PatrimonioView`. `error`: módulo degradado a
  // `{ error }` en la megacarga (ver `lib/app-data/get-app-data.ts`).
  onboarding: boolean;
  error: string | null;
  overview: PortfolioOverview | null;
  platforms: InvestmentPlatform[];
  assets: PortfolioAsset[];
  transactions: PortfolioTransaction[];
  savingsPlan: SavingsPlanItem[];
  snapshots: PortfolioSnapshot[];
  passiveIncome: PassiveIncome[];

  // Price change map: isin → day change %
  priceChanges: Record<string, number | null>;

  // Loading
  isLoading: boolean;
  isLoadingPrices: boolean;
  pricesLastUpdated: string | null;

  // Navigation
  activePlatform: PlatformSlug | 'all' | 'dashboard';
  activeAssetId: string | null;

  // Year filter
  selectedYear: string | 'all';

  // Privacy mode
  privacyMode: boolean;
  togglePrivacyMode: () => void;

  // Actions
  setOnboarding: (onboarding: boolean) => void;
  setError: (error: string | null) => void;
  setOverview: (overview: PortfolioOverview) => void;
  setPlatforms: (platforms: InvestmentPlatform[]) => void;
  setAssets: (assets: PortfolioAsset[]) => void;
  setTransactions: (transactions: PortfolioTransaction[]) => void;
  setSavingsPlan: (plan: SavingsPlanItem[]) => void;
  setSnapshots: (snapshots: PortfolioSnapshot[]) => void;
  setPassiveIncome: (income: PassiveIncome[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsLoadingPrices: (loading: boolean) => void;
  setActivePlatform: (slug: PlatformSlug | 'all' | 'dashboard') => void;
  setActiveAsset: (id: string | null) => void;
  updateAssetPrice: (assetId: string, price: number, priceEur?: number) => void;
  updateAssetPriceByIsin: (isin: string, priceEur: number) => void;
  setPriceChange: (isin: string, changePercent: number | null) => void;
  setPricesLastUpdated: (ts: string) => void;
  setSelectedYear: (year: string | 'all') => void;

  // Selectors
  getAssetsByPlatformSlug: (slug: PlatformSlug) => PortfolioAsset[];
  getPlatformSummary: (slug: PlatformSlug) => PlatformSummary | null;
  getTRAssets: () => PortfolioAsset[];
  getTRCurrentValue: () => number;
  getTRInvestmentValue: () => number;
  getAvailableYears: () => string[];
  getAllocationByCategory: () => AllocationSlice[];
  getAllocationByGeography: () => AllocationSlice[];
  getAllocationByRisk: () => AllocationSlice[];
  getAllocationByCurrency: () => AllocationSlice[];
  getAllocationBySector: () => AllocationSlice[];
  getPLBarData: () => PLBarItem[];
  getTopGainers: (n?: number) => PortfolioAsset[];
  getTopLosers: (n?: number) => PortfolioAsset[];
  getEvolutionData: () => EvolutionPoint[];
  getPassiveIncomeByMonth: () => PassiveIncomeBarItem[];
  getTotalMonthlyPlan: () => number;
  getPassiveIncomeYTD: () => number;
  getCAGR: () => number | null;
  getMaxDrawdown: () => number | null;
  getDrawdownSeries: () => Array<{ date: string; label: string; value: number }>;
  getTWR: () => number | null;
  getAnnualizedVolatility: () => number | null;
  getSharpeRatio: () => number | null;
  getMonthlyKPIDeltas: () => { totalValue: number | null; capitalInvertido: number | null; passiveIncomeMonth: number | null };
  getKPISparklines: () => { totalValue: number[]; capitalInvertido: number[]; plAmount: number[] };
}

export const usePatrimonioStore = create<PatrimonioStore>((set, get) => ({
  onboarding: false,
  error: null,
  overview: null,
  platforms: [],
  assets: [],
  transactions: [],
  savingsPlan: [],
  snapshots: [],
  passiveIncome: [],
  priceChanges: {},
  isLoading: false,
  isLoadingPrices: false,
  pricesLastUpdated: null,
  activePlatform: 'dashboard',
  activeAssetId: null,
  selectedYear: new Date().getFullYear().toString(),
  privacyMode: false,
  togglePrivacyMode: () => set((s) => ({ privacyMode: !s.privacyMode })),

  setOnboarding: (onboarding) => set({ onboarding }),
  setError: (error) => set({ error }),
  setOverview: (overview) => set({ overview }),
  setPlatforms: (platforms) => set({ platforms }),
  setAssets: (assets) => set({ assets }),
  setTransactions: (transactions) => set({ transactions }),
  setSavingsPlan: (savingsPlan) => set({ savingsPlan }),
  setSnapshots: (snapshots) => set({ snapshots }),
  setPassiveIncome: (passiveIncome) => set({ passiveIncome }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsLoadingPrices: (isLoadingPrices) => set({ isLoadingPrices }),
  setActivePlatform: (activePlatform) => set({ activePlatform }),
  setActiveAsset: (activeAssetId) => set({ activeAssetId }),
  setPricesLastUpdated: (ts) => set({ pricesLastUpdated: ts }),
  setSelectedYear: (selectedYear) => set({ selectedYear }),

  updateAssetPrice: (assetId, price, priceEur) => {
    const eur = priceEur ?? price;
    set((state) => ({
      assets: state.assets.map((a) => {
        if (a.id !== assetId) return a;
        const currentValue = eur * a.current_quantity;
        const plAmount = currentValue - a.total_invested;
        const plPercentage = a.total_invested > 0 ? (plAmount / a.total_invested) * 100 : 0;
        return {
          ...a,
          current_price: price,
          current_price_eur: eur,
          price_updated_at: new Date().toISOString(),
          current_value: currentValue,
          pl_amount: plAmount,
          pl_percentage: plPercentage,
        };
      }),
    }));
  },

  updateAssetPriceByIsin: (isin, priceEur) => {
    set((state) => {
      const updatedAssets = state.assets.map((a) => {
        if (!a.isin || a.isin !== isin) return a;
        const currentValue = priceEur * a.current_quantity;
        const plAmount = currentValue - a.total_invested;
        const plPercentage = a.total_invested > 0 ? (plAmount / a.total_invested) * 100 : 0;
        return {
          ...a,
          current_price: priceEur,
          current_price_eur: priceEur,
          price_updated_at: new Date().toISOString(),
          current_value: currentValue,
          pl_amount: plAmount,
          pl_percentage: plPercentage,
        };
      });

      // Recalculate overview from updated assets
      const totalValue = updatedAssets.reduce((s, a) => s + (a.current_value ?? 0), 0);
      const totalInvested = updatedAssets.reduce((s, a) => s + a.total_invested, 0);
      const totalCash = updatedAssets
        .filter((a) => a.category === 'cash')
        .reduce((s, a) => s + (a.current_value ?? 0), 0);
      const plAmount = totalValue - totalInvested;
      const nonCashInvested = totalInvested - totalCash;
      const plPercentage = nonCashInvested > 0 ? (plAmount / nonCashInvested) * 100 : 0;

      const updatedOverview = state.overview
        ? {
            ...state.overview,
            total_value: totalValue,
            pl_amount: plAmount,
            pl_percentage: plPercentage,
          }
        : state.overview;

      return { assets: updatedAssets, overview: updatedOverview };
    });
  },

  setPriceChange: (isin, changePercent) => {
    set((state) => ({
      priceChanges: { ...state.priceChanges, [isin]: changePercent },
    }));
  },

  getAssetsByPlatformSlug: (slug) => {
    const { assets, platforms } = get();
    const platform = platforms.find((p) => p.slug === slug);
    if (!platform) return [];
    return assets.filter((a) => a.platform_id === platform.id);
  },

  getPlatformSummary: (slug) => {
    const { overview } = get();
    if (!overview) return null;
    return overview.platforms.find((p) => p.platform.slug === slug) ?? null;
  },

  getTRAssets: () => get().getAssetsByPlatformSlug('trade-republic'),

  getTRCurrentValue: () =>
    get()
      .getTRAssets()
      .reduce((sum, a) => sum + (a.current_value ?? 0), 0),

  getTRInvestmentValue: () =>
    get()
      .getTRAssets()
      .filter((a) => a.category !== 'cash')
      .reduce((sum, a) => sum + (a.current_value ?? 0), 0),

  getAvailableYears: () => {
    const { transactions, passiveIncome, snapshots } = get();
    const years = new Set<string>();
    for (const t of transactions) years.add(t.transaction_date.substring(0, 4));
    for (const i of passiveIncome) years.add(i.income_date.substring(0, 4));
    for (const s of snapshots) years.add(s.snapshot_date.substring(0, 4));
    return Array.from(years).sort();
  },

  getAllocationByCategory: () => {
    const trAssets = get().getTRAssets().filter((a) => a.category !== 'cash');
    const totalValue = trAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);
    if (totalValue === 0) return [];

    const grouped = new Map<AssetCategory, number>();
    for (const asset of trAssets) {
      const current = grouped.get(asset.category) ?? 0;
      grouped.set(asset.category, current + (asset.current_value ?? 0));
    }

    return Array.from(grouped.entries())
      .map(([category, value]) => ({
        name: CATEGORY_LABELS[category],
        value,
        percentage: (value / totalValue) * 100,
        color: CATEGORY_COLORS[category],
      }))
      .sort((a, b) => b.value - a.value);
  },

  getAllocationByGeography: () => {
    const trAssets = get().getTRAssets().filter((a) => a.category !== 'cash');
    const totalValue = trAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);
    if (totalValue === 0) return [];

    const geoColors: Record<string, string> = {
      Global: 'var(--color-gain)',
      USA: 'var(--module-gastos)',
      Europa: 'var(--module-mercados)',
      Emergentes: 'var(--accent-terracotta)',
      China: '#E67E22',
      Taiwan: 'var(--module-notas)',
      Otro: 'var(--text-muted)',
    };

    const grouped = new Map<string, number>();
    for (const asset of trAssets) {
      const region = asset.geographic_region ?? 'Otro';
      const current = grouped.get(region) ?? 0;
      grouped.set(region, current + (asset.current_value ?? 0));
    }

    return Array.from(grouped.entries())
      .map(([region, value]) => ({
        name: region,
        value,
        percentage: (value / totalValue) * 100,
        color: geoColors[region] ?? 'var(--text-muted)',
      }))
      .sort((a, b) => b.value - a.value);
  },

  getAllocationByRisk: () => {
    const trAssets = get().getTRAssets().filter((a) => a.category !== 'cash');
    const totalValue = trAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);
    if (totalValue === 0) return [];

    const riskColors: Record<string, string> = {
      very_low: '#6DB33F',
      low: 'var(--color-gain)',
      medium: 'var(--module-notas)',
      high: 'var(--accent-terracotta)',
      very_high: 'var(--color-loss)',
    };
    const riskLabels: Record<string, string> = {
      very_low: 'Muy bajo',
      low: 'Bajo',
      medium: 'Medio',
      high: 'Alto',
      very_high: 'Muy alto',
    };

    const grouped = new Map<string, number>();
    for (const asset of trAssets) {
      const risk = asset.risk_level;
      const current = grouped.get(risk) ?? 0;
      grouped.set(risk, current + (asset.current_value ?? 0));
    }

    const order = ['very_low', 'low', 'medium', 'high', 'very_high'];
    return order
      .filter((r) => grouped.has(r))
      .map((risk) => ({
        name: riskLabels[risk],
        value: grouped.get(risk)!,
        percentage: (grouped.get(risk)! / totalValue) * 100,
        color: riskColors[risk],
      }));
  },

  getPLBarData: () => {
    const trAssets = get().getTRAssets().filter((a) => a.category !== 'cash');
    return trAssets
      .filter((a) => a.pl_amount !== undefined)
      .map((a) => ({
        name: a.name.length > 20 ? a.name.substring(0, 20) + '…' : a.name,
        ticker: a.ticker ?? a.isin?.substring(0, 6) ?? '',
        pl_amount: a.pl_amount ?? 0,
        pl_percentage: a.pl_percentage ?? 0,
        color: (a.pl_amount ?? 0) >= 0 ? 'var(--color-gain)' : 'var(--color-loss)',
      }))
      .sort((a, b) => b.pl_percentage - a.pl_percentage);
  },

  getTopGainers: (n = 5) =>
    get()
      .getTRAssets()
      .filter((a) => a.category !== 'cash' && (a.pl_amount ?? 0) > 0)
      .sort((a, b) => (b.pl_percentage ?? 0) - (a.pl_percentage ?? 0))
      .slice(0, n),

  getTopLosers: (n = 5) =>
    get()
      .getTRAssets()
      .filter((a) => a.category !== 'cash' && (a.pl_amount ?? 0) < 0)
      .sort((a, b) => (a.pl_percentage ?? 0) - (b.pl_percentage ?? 0))
      .slice(0, n),

  getEvolutionData: () => {
    const { snapshots } = get();
    return snapshots.map((s) => ({
      date: s.snapshot_date,
      value: s.total_value,
      invested: s.total_invested,
      pl: s.pl_amount ?? 0,
    }));
  },

  getPassiveIncomeByMonth: () => {
    const { passiveIncome } = get();
    const map = new Map<string, { interest: number; dividend: number }>();

    for (const item of passiveIncome) {
      const month = item.income_date.substring(0, 7); // YYYY-MM
      const current = map.get(month) ?? { interest: 0, dividend: 0 };
      if (item.type === 'interest') {
        current.interest += item.amount;
      } else {
        current.dividend += item.amount;
      }
      map.set(month, current);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { interest, dividend }]) => ({
        month,
        interest,
        dividend,
        total: interest + dividend,
      }));
  },

  getTotalMonthlyPlan: () =>
    get()
      .savingsPlan.filter((item) => item.is_active)
      .reduce((sum, item) => sum + item.monthly_amount, 0),

  getPassiveIncomeYTD: () => {
    const year = new Date().getFullYear().toString();
    return get()
      .passiveIncome.filter((item) => item.income_date.startsWith(year))
      .reduce((sum, item) => sum + item.amount, 0);
  },

  getCAGR: () => {
    // Derive annualized return from TWR to avoid distortion caused by DCA and
    // small initial non-cash values (which inflated the simple CAGR formula).
    const { snapshots } = get();
    if (snapshots.length < 2) return null;
    const twr = get().getTWR();
    if (twr === null) return null;
    const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const firstDate = new Date(sorted[0].snapshot_date);
    const lastDate = new Date(sorted[sorted.length - 1].snapshot_date);
    const days = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    // Require at least 90 days to produce a meaningful annualized figure
    if (days < 90) return null;
    const cagr = Math.pow(1 + twr, 365.25 / days) - 1;
    // Cap at ±200% — anything beyond is a data artifact
    if (!isFinite(cagr) || Math.abs(cagr) > 2) return null;
    return cagr;
  },

  getMaxDrawdown: () => {
    // Derivado de la serie de drawdown para que el KPI coincida exactamente con el
    // mínimo de la curva underwater que se pinta.
    const series = get().getDrawdownSeries();
    if (series.length < 2) return null;
    const min = Math.min(...series.map((p) => p.value));
    return isFinite(min) ? min : null;
  },

  getDrawdownSeries: () => {
    const { snapshots } = get();
    if (snapshots.length < 2) return [];
    const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    // Un punto por mes (último snapshot de cada mes) para una curva limpia.
    const byMonth = new Map<string, (typeof sorted)[number]>();
    for (const s of sorted) byMonth.set(s.snapshot_date.substring(0, 7), s);
    const monthly = Array.from(byMonth.values()).sort((a, b) =>
      a.snapshot_date.localeCompare(b.snapshot_date)
    );
    if (monthly.length < 2) return [];

    const fmt = (d: string) =>
      new Date(`${d}T00:00:00`).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });

    // Curva TWR (misma lógica que getTWR/getMaxDrawdown): drawdown = twr/peak − 1.
    // El valor absoluto siempre sube con aportaciones → daría 0% siempre; por eso TWR.
    const series: Array<{ date: string; label: string; value: number }> = [
      { date: monthly[0].snapshot_date, label: fmt(monthly[0].snapshot_date), value: 0 },
    ];
    let twr = 1;
    let peak = 1;
    for (let i = 1; i < monthly.length; i++) {
      const prev = monthly[i - 1];
      const curr = monthly[i];
      const denominator = prev.total_value + (curr.total_invested - prev.total_invested);
      if (denominator <= 0) continue;
      const periodReturn = curr.total_value / denominator;
      if (!isFinite(periodReturn) || Math.abs(periodReturn - 1) > 0.5) continue;
      twr *= periodReturn;
      if (twr > peak) peak = twr;
      const dd = (twr / peak - 1) * 100;
      series.push({
        date: curr.snapshot_date,
        label: fmt(curr.snapshot_date),
        value: parseFloat(dd.toFixed(2)),
      });
    }
    return series;
  },

  getTWR: () => {
    const { snapshots } = get();
    if (snapshots.length < 2) return null;
    const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    let twr = 1;
    let validPeriods = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevInv = prev.total_value;
      const currInv = curr.total_value;
      const cashFlow = curr.total_invested - prev.total_invested;
      const denominator = prevInv + cashFlow;
      if (denominator <= 0) continue;
      const periodReturn = currInv / denominator;
      // Skip periods with >50% change — likely purchase-price revaluation artifact
      // (snapshots generated from last-purchase-price revalue all units, creating fake gains/losses)
      if (!isFinite(periodReturn) || Math.abs(periodReturn - 1) > 0.5) continue;
      twr *= periodReturn;
      validPeriods++;
    }
    if (validPeriods === 0) return null;
    const result = twr - 1;
    if (!isFinite(result) || Math.abs(result) > 10) return null;
    return result;
  },

  getAnnualizedVolatility: () => {
    const { snapshots } = get();
    if (snapshots.length < 3) return null;
    const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const returns: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevInv = prev.total_value;
      const currInv = curr.total_value;
      if (prevInv <= 0) continue;
      const cashFlow = curr.total_invested - prev.total_invested;
      // Use cashflow-adjusted return to avoid inflating volatility with injected capital
      const adjustedReturn = (currInv - cashFlow - prevInv) / prevInv;
      if (!isFinite(adjustedReturn) || Math.abs(adjustedReturn) > 0.5) continue;
      returns.push(adjustedReturn);
    }
    // Need at least 3 valid periods for a meaningful standard deviation
    if (returns.length < 3) return null;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    // Assume monthly snapshots — annualize with sqrt(12)
    const vol = Math.sqrt(variance) * Math.sqrt(12);
    // Guard: volatility is always non-negative; >500% annualized is a data artifact
    if (!isFinite(vol) || isNaN(vol) || vol < 0 || vol > 5) return null;
    return vol;
  },

  getSharpeRatio: () => {
    const cagr = get().getCAGR();
    const vol = get().getAnnualizedVolatility();
    if (cagr === null || vol === null || vol === 0) return null;
    const riskFreeRate = 0.03; // Euribor approx
    const sharpe = (cagr - riskFreeRate) / vol;
    if (!isFinite(sharpe) || Math.abs(sharpe) > 10) return null;
    return sharpe;
  },

  getMonthlyKPIDeltas: () => {
    const { snapshots, passiveIncome, transactions } = get();
    const trAssets = get().getTRAssets();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const prevSnapshot = [...sorted].reverse().find((s) => s.snapshot_date.startsWith(prevMonth));

    // totalValue delta: snapshot comparison (value change vs last month)
    let totalValueDelta: number | null = null;
    if (prevSnapshot) {
      const currentTotal = trAssets.reduce((s, a) => s + (a.current_value ?? 0), 0);
      const currentCash = trAssets.filter((a) => a.category === 'cash').reduce((s, a) => s + (a.current_value ?? 0), 0);
      const currentCapital = currentTotal - currentCash;
      const prevCapital = prevSnapshot.total_value;
      const capitalDelta = currentCapital - prevCapital;
      const sanityLimit = Math.max(currentCapital, 1000);
      totalValueDelta = Math.abs(capitalDelta) > sanityLimit ? null : capitalDelta;
    }

    // capitalInvertido delta: real new money in this month (savings_plan + saveback only — buy uses existing cash)
    const CONTRIBUTION_TYPES = new Set(['savings_plan', 'saveback']);
    const capitalInvertido = transactions
      .filter((tx) => {
        if (!CONTRIBUTION_TYPES.has(tx.type)) return false;
        return tx.transaction_date.startsWith(currentMonth);
      })
      .reduce((s, tx) => s + tx.total_amount, 0) || null;

    const incomeThis = passiveIncome.filter((i) => i.income_date.startsWith(currentMonth)).reduce((s, i) => s + i.amount, 0);
    const incomePrev = passiveIncome.filter((i) => i.income_date.startsWith(prevMonth)).reduce((s, i) => s + i.amount, 0);

    return {
      totalValue: totalValueDelta,
      capitalInvertido,
      passiveIncomeMonth: incomeThis - incomePrev,
    };
  },

  getKPISparklines: () => {
    const { snapshots } = get();
    const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const last = sorted.slice(-12);
    return {
      totalValue: last.map((s) => s.total_value),
      capitalInvertido: last.map((s) => s.total_invested),
      plAmount: last.map((s) => s.pl_amount ?? 0),
    };
  },

  getAllocationByCurrency: () => {
    const trAssets = get().getTRAssets().filter((a) => a.category !== 'cash');
    const totalValue = trAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);
    if (totalValue === 0) return [];
    const currencyColors: Record<string, string> = {
      EUR: 'var(--color-gain)', USD: 'var(--module-gastos)', GBP: 'var(--module-mercados)', GBX: 'var(--module-mercados)', HKD: '#E67E22',
    };
    const grouped = new Map<string, number>();
    for (const asset of trAssets) {
      const cur = asset.currency;
      grouped.set(cur, (grouped.get(cur) ?? 0) + (asset.current_value ?? 0));
    }
    return Array.from(grouped.entries())
      .map(([currency, value]) => ({
        name: currency, value, percentage: (value / totalValue) * 100,
        color: currencyColors[currency] ?? 'var(--text-muted)',
      }))
      .sort((a, b) => b.value - a.value);
  },

  getAllocationBySector: () => {
    const trAssets = get().getTRAssets().filter((a) => a.category !== 'cash');
    const totalValue = trAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);
    if (totalValue === 0) return [];
    const sectorColors: Record<string, string> = {
      Tecnología: 'var(--module-gastos)', Finanzas: 'var(--color-gain)', Salud: '#6DB33F',
      Consumo: 'var(--accent-terracotta)', Industria: 'var(--module-mercados)', Energía: 'var(--module-notas)',
      Materiales: '#E67E22', Utilities: 'var(--text-muted)', 'Índice Global': 'var(--urgency-safe)',
      Inmobiliario: 'var(--platform-crypto)', Otro: '#C0B8AE',
    };
    const grouped = new Map<string, number>();
    for (const asset of trAssets) {
      const sector = asset.sector ?? 'Otro';
      grouped.set(sector, (grouped.get(sector) ?? 0) + (asset.current_value ?? 0));
    }
    return Array.from(grouped.entries())
      .map(([sector, value]) => ({
        name: sector, value, percentage: (value / totalValue) * 100,
        color: sectorColors[sector] ?? 'var(--text-muted)',
      }))
      .sort((a, b) => b.value - a.value);
  },
}));
