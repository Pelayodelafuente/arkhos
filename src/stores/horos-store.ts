'use client';

import { create } from 'zustand';
import type {
  HorosPosition,
  HorosTransaction,
  HorosNavHistory,
  HorosFundDistribution,
  HorosAnnualCosts,
  HorosMonthlyPlan,
  HorosOverview,
  HorosTransactionPerformance,
  HorosDCAPoint,
  HorosPortfolioPoint,
  HorosProjectionPoint,
} from '@/types/horos';

type ActiveTab = 'dashboard' | 'transactions' | 'costs' | 'plan' | 'fiscal';

interface HorosStore {
  // State
  position: HorosPosition | null;
  transactions: HorosTransaction[];
  navHistory: HorosNavHistory[];
  distribution: HorosFundDistribution[];
  costs: HorosAnnualCosts[];
  plan: HorosMonthlyPlan | null;
  isLoading: boolean;
  activeTab: ActiveTab;

  // Actions
  setPosition: (position: HorosPosition | null) => void;
  setTransactions: (transactions: HorosTransaction[]) => void;
  setNavHistory: (history: HorosNavHistory[]) => void;
  setDistribution: (distribution: HorosFundDistribution[]) => void;
  setCosts: (costs: HorosAnnualCosts[]) => void;
  setPlan: (plan: HorosMonthlyPlan | null) => void;
  setIsLoading: (loading: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;

  // Selectors
  getOverview: () => HorosOverview | null;
  getTransactionPerformance: () => HorosTransactionPerformance[];
  getDCAChartData: () => HorosDCAPoint[];
  getPortfolioChartData: () => HorosPortfolioPoint[];
  getNAVChartData: () => Array<{ date: string; nav: number; avgNav: number | null }>;
  getSectorData: () => Array<{ name: string; value: number; pct: number; color: string }>;
  getGeoData: () => Array<{ name: string; value: number; pct: number; color: string }>;
  getProjection: (years: number, annualReturn: number, monthlyContrib: number) => HorosProjectionPoint[];
  getLastMonthContribution: () => number | null;
}

const SECTOR_COLORS = [
  '#8B1A2E',
  '#A83040',
  '#C44A5A',
  '#D46070',
  '#7B2D3A',
  '#9B3D50',
  '#BB5068',
  '#6B2030',
];

const GEO_COLORS = [
  '#7260C4',
  '#8A78D0',
  '#A290DC',
  '#5A4A9E',
  '#9878C8',
  '#B098D8',
  '#6858B0',
];

export const useHorosStore = create<HorosStore>((set, get) => ({
  position: null,
  transactions: [],
  navHistory: [],
  distribution: [],
  costs: [],
  plan: null,
  isLoading: false,
  activeTab: 'dashboard',

  setPosition: (position) => set({ position }),
  setTransactions: (transactions) => set({ transactions }),
  setNavHistory: (navHistory) => set({ navHistory }),
  setDistribution: (distribution) => set({ distribution }),
  setCosts: (costs) => set({ costs }),
  setPlan: (plan) => set({ plan }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab }),

  getOverview: () => {
    const pos = get().position;
    if (!pos) return null;
    const avgNav = pos.shares > 0 ? pos.total_cost / pos.shares : 0;
    return {
      total_value: pos.total_value,
      total_cost: pos.total_cost,
      shares: pos.shares,
      nav_price: pos.nav_price,
      nav_date: pos.nav_date,
      unrealized_gain: pos.unrealized_gain,
      unrealized_gain_pct: pos.unrealized_gain_pct,
      avg_nav: avgNav,
      nav_gain_per_share: pos.nav_price - avgNav,
      isin: pos.isin,
      fund_name: pos.fund_name,
    };
  },

  getTransactionPerformance: () => {
    const pos = get().position;
    const transactions = get().transactions;
    if (!pos || transactions.length === 0) return [];

    return transactions.map((tx) => {
      const currentValue = tx.shares * pos.nav_price;
      const gain = currentValue - tx.amount;
      const gainPct = tx.amount > 0 ? (gain / tx.amount) * 100 : 0;
      return { transaction: tx, current_value: currentValue, gain, gain_pct: gainPct };
    });
  },

  getDCAChartData: () => {
    return get().transactions.map((tx) => ({
      label: new Date(tx.value_date).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      nav_applied: tx.nav_applied,
      amount: tx.amount,
      shares: tx.shares,
      date: tx.value_date,
    }));
  },

  getPortfolioChartData: () => {
    const transactions = get().transactions;
    const navHistory = get().navHistory;
    if (transactions.length === 0 || navHistory.length === 0) return [];

    let cumInvested = 0;
    const txMap = new Map<string, number>();
    for (const tx of transactions) {
      txMap.set(tx.value_date, (txMap.get(tx.value_date) ?? 0) + tx.amount);
    }

    return navHistory.map((h) => {
      const txOnDate = txMap.get(h.nav_date) ?? 0;
      cumInvested += txOnDate;
      return {
        label: new Date(h.nav_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        portfolio_value: h.portfolio_value,
        cumulative_invested: cumInvested,
        nav_date: h.nav_date,
      };
    });
  },

  getNAVChartData: () => {
    const overview = get().getOverview();
    const avgNav = overview?.avg_nav ?? null;
    return get().navHistory.map((h) => ({
      date: new Date(h.nav_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      nav: h.nav_price,
      avgNav,
    }));
  },

  getSectorData: () => {
    const sectorItems = get().distribution.filter((d) => d.dimension === 'sector');
    const pos = get().position;
    const totalValue = pos?.total_value ?? 0;
    return sectorItems.map((d, i) => ({
      name: d.category,
      value: parseFloat(((d.percentage / 100) * totalValue).toFixed(2)),
      pct: d.percentage,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
    }));
  },

  getGeoData: () => {
    const geoItems = get().distribution.filter((d) => d.dimension === 'geography');
    const pos = get().position;
    const totalValue = pos?.total_value ?? 0;
    return geoItems.map((d, i) => ({
      name: d.category,
      value: parseFloat(((d.percentage / 100) * totalValue).toFixed(2)),
      pct: d.percentage,
      color: GEO_COLORS[i % GEO_COLORS.length],
    }));
  },

  getProjection: (years: number, annualReturn: number, monthlyContrib: number) => {
    const currentValue = get().position?.total_value ?? 0;
    const r = annualReturn / 100;
    const points: HorosProjectionPoint[] = [];

    for (let y = 1; y <= years; y++) {
      const fv =
        currentValue * Math.pow(1 + r, y) +
        monthlyContrib * ((Math.pow(1 + r / 12, y * 12) - 1) / (r / 12));
      const totalContrib = currentValue + monthlyContrib * y * 12;
      points.push({
        year: y,
        label: `Año ${y}`,
        projected_value: parseFloat(fv.toFixed(2)),
        total_contributed: parseFloat(totalContrib.toFixed(2)),
        interest_earned: parseFloat((fv - totalContrib).toFixed(2)),
      });
    }
    return points;
  },

  getLastMonthContribution: () => get().plan?.monthly_amount ?? null,
}));
