'use client';

import { create } from 'zustand';
import type {
  IndexaFund,
  IndexaPosition,
  IndexaTransaction,
  IndexaMonthlyReturn,
  IndexaMonthlyPlan,
  IndexaOverview,
  IndexaMonthlyTableRow,
  IndexaProjectionPoint,
} from '@/types/indexa';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface IndexaStore {
  // State
  overview: IndexaOverview | null;
  funds: IndexaFund[];
  positions: IndexaPosition[];
  transactions: IndexaTransaction[];
  monthlyReturns: IndexaMonthlyReturn[];
  plan: IndexaMonthlyPlan | null;
  isLoading: boolean;
  activeTab: 'dashboard' | 'performance' | 'plan' | 'fiscal';

  // Actions
  setOverview: (overview: IndexaOverview | null) => void;
  setFunds: (funds: IndexaFund[]) => void;
  setPositions: (positions: IndexaPosition[]) => void;
  setTransactions: (transactions: IndexaTransaction[]) => void;
  setMonthlyReturns: (returns: IndexaMonthlyReturn[]) => void;
  setPlan: (plan: IndexaMonthlyPlan | null) => void;
  setIsLoading: (loading: boolean) => void;
  setActiveTab: (tab: IndexaStore['activeTab']) => void;

  // Selectors
  getMonthlyReturnsTable: () => IndexaMonthlyTableRow[];
  getProjection: (years: number, annualReturn: number, monthlyContrib: number) => IndexaProjectionPoint[];
  getTWRChartData: () => Array<{ label: string; twr: number; benchmark: number | null }>;
  getEvolutionData: () => Array<{ label: string; value: number; cost: number }>;
  getMonthName: (month: number) => string;
}

export const useIndexaStore = create<IndexaStore>((set, get) => ({
  overview: null,
  funds: [],
  positions: [],
  transactions: [],
  monthlyReturns: [],
  plan: null,
  isLoading: false,
  activeTab: 'dashboard',

  setOverview: (overview) => set({ overview }),
  setFunds: (funds) => set({ funds }),
  setPositions: (positions) => set({ positions }),
  setTransactions: (transactions) => set({ transactions }),
  setMonthlyReturns: (monthlyReturns) => set({ monthlyReturns }),
  setPlan: (plan) => set({ plan }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab }),

  getMonthName: (month: number) => MONTHS[month - 1] ?? String(month),

  getMonthlyReturnsTable: () => {
    const returns = get().monthlyReturns;
    const years = [...new Set(returns.map((r) => r.year))].sort();
    return years.map((year) => {
      const yearRows = returns.filter((r) => r.year === year);
      const months: (number | null)[] = Array.from({ length: 12 }, (_, i) => {
        const r = yearRows.find((r) => r.month === i + 1);
        return r?.return_pct ?? null;
      });
      const benchmarks: (number | null)[] = Array.from({ length: 12 }, (_, i) => {
        const r = yearRows.find((r) => r.month === i + 1);
        return r?.benchmark_pct ?? null;
      });
      const validMonths = months.filter((v): v is number => v !== null);
      let total: number | null = null;
      if (validMonths.length > 0) {
        total = validMonths.reduce((acc, v) => acc * (1 + v / 100), 1) * 100 - 100;
      }
      return { year, months, benchmarks, total };
    });
  },

  getTWRChartData: () => {
    return get().monthlyReturns.map((r) => {
      const name = get().getMonthName(r.month);
      return {
        label: `${name} ${r.year}`,
        twr: r.cumulative_twr ?? 0,
        benchmark: r.benchmark_pct !== null ? r.cumulative_twr : null,
      };
    });
  },

  getEvolutionData: () => {
    const transactions = get().transactions;
    const monthlyReturns = get().monthlyReturns;
    if (transactions.length === 0) return [];

    // Only subscriptions are real new money — transfer_in are internal rebalances
    const subscriptions = transactions.filter((tx) => tx.type === 'subscription');

    // Monthly new contributions map: 'YYYY-MM' → amount
    const contribMap = new Map<string, number>();
    for (const tx of subscriptions) {
      const d = new Date(tx.transaction_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      contribMap.set(key, (contribMap.get(key) ?? 0) + tx.amount);
    }

    // Build value series using monthly returns (TWR-based)
    // For each month: value_end = (value_prev + new_contributions) × (1 + return%)
    const returnMap = new Map<string, number>();
    for (const r of monthlyReturns) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      returnMap.set(key, (r.return_pct ?? 0) / 100);
    }

    // Get sorted union of months from both maps
    const allKeys = [...new Set([...contribMap.keys(), ...returnMap.keys()])].sort();

    const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    let value = 0;
    let cumCost = 0;
    const result: Array<{ label: string; value: number; cost: number }> = [];

    for (const key of allKeys) {
      const contrib = contribMap.get(key) ?? 0;
      const ret = returnMap.get(key) ?? 0;
      cumCost += contrib;
      value = (value + contrib) * (1 + ret);
      const [y, m] = key.split('-');
      const label = `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
      result.push({ label, value: parseFloat(value.toFixed(2)), cost: parseFloat(cumCost.toFixed(2)) });
    }

    return result;
  },

  getProjection: (years: number, annualReturn: number, monthlyContrib: number) => {
    const currentValue = get().overview?.total_value ?? 0;
    const r = annualReturn / 100;
    const points: IndexaProjectionPoint[] = [];

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
}));
