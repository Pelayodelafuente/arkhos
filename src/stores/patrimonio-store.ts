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
  overview: PortfolioOverview | null;
  platforms: InvestmentPlatform[];
  assets: PortfolioAsset[];
  transactions: PortfolioTransaction[];
  savingsPlan: SavingsPlanItem[];
  snapshots: PortfolioSnapshot[];
  passiveIncome: PassiveIncome[];

  // Loading
  isLoading: boolean;
  isLoadingPrices: boolean;
  pricesLastUpdated: string | null;

  // Navigation
  activePlatform: PlatformSlug | 'all';
  activeAssetId: string | null;

  // Year filter
  selectedYear: string | 'all';

  // Actions
  setOverview: (overview: PortfolioOverview) => void;
  setPlatforms: (platforms: InvestmentPlatform[]) => void;
  setAssets: (assets: PortfolioAsset[]) => void;
  setTransactions: (transactions: PortfolioTransaction[]) => void;
  setSavingsPlan: (plan: SavingsPlanItem[]) => void;
  setSnapshots: (snapshots: PortfolioSnapshot[]) => void;
  setPassiveIncome: (income: PassiveIncome[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsLoadingPrices: (loading: boolean) => void;
  setActivePlatform: (slug: PlatformSlug | 'all') => void;
  setActiveAsset: (id: string | null) => void;
  updateAssetPrice: (assetId: string, price: number, priceEur?: number) => void;
  setPricesLastUpdated: (ts: string) => void;
  setSelectedYear: (year: string | 'all') => void;

  // Selectors
  getAssetsByPlatformSlug: (slug: PlatformSlug) => PortfolioAsset[];
  getPlatformSummary: (slug: PlatformSlug) => PlatformSummary | null;
  getTRAssets: () => PortfolioAsset[];
  getAvailableYears: () => string[];
  getAllocationByCategory: () => AllocationSlice[];
  getAllocationByGeography: () => AllocationSlice[];
  getAllocationByRisk: () => AllocationSlice[];
  getPLBarData: () => PLBarItem[];
  getTopGainers: (n?: number) => PortfolioAsset[];
  getTopLosers: (n?: number) => PortfolioAsset[];
  getEvolutionData: () => EvolutionPoint[];
  getPassiveIncomeByMonth: () => PassiveIncomeBarItem[];
  getTotalMonthlyPlan: () => number;
  getPassiveIncomeYTD: () => number;
}

export const usePatrimonioStore = create<PatrimonioStore>((set, get) => ({
  overview: null,
  platforms: [],
  assets: [],
  transactions: [],
  savingsPlan: [],
  snapshots: [],
  passiveIncome: [],
  isLoading: false,
  isLoadingPrices: false,
  pricesLastUpdated: null,
  activePlatform: 'all',
  activeAssetId: null,
  selectedYear: new Date().getFullYear().toString(),

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
      Global: '#2E7D6B',
      USA: '#3B78B0',
      Europa: '#7260C4',
      Emergentes: '#C4704A',
      China: '#E67E22',
      Taiwan: '#B07A3A',
      Otro: '#888780',
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
        color: geoColors[region] ?? '#888780',
      }))
      .sort((a, b) => b.value - a.value);
  },

  getAllocationByRisk: () => {
    const trAssets = get().getTRAssets().filter((a) => a.category !== 'cash');
    const totalValue = trAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);
    if (totalValue === 0) return [];

    const riskColors: Record<string, string> = {
      very_low: '#6DB33F',
      low: '#2E7D6B',
      medium: '#B07A3A',
      high: '#C4704A',
      very_high: '#A32D2D',
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
        color: (a.pl_amount ?? 0) >= 0 ? '#2E7D6B' : '#A32D2D',
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
}));
