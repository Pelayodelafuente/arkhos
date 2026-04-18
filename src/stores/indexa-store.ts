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
    if (transactions.length === 0) return [];

    // Build monthly evolution from transactions (sorted ascending)
    const sorted = [...transactions].sort(
      (a, b) =>
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    const monthMap = new Map<string, { cost: number }>();
    for (const tx of sorted) {
      const d = new Date(tx.transaction_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const isInflow = tx.type === 'subscription' || tx.type === 'transfer_in';
      if (isInflow) {
        const existing = monthMap.get(key) ?? { cost: 0 };
        existing.cost += tx.amount;
        monthMap.set(key, existing);
      }
    }

    const positions = get().positions;
    const currentValue = positions.reduce((s, p) => s + p.total_value, 0);
    const currentCost = positions.reduce((s, p) => s + p.total_cost, 0);

    // Build cumulative cost per month and estimate value proportionally
    const keys = [...monthMap.keys()].sort();
    let cumCost = 0;
    return keys.map((key, i) => {
      cumCost += monthMap.get(key)?.cost ?? 0;
      const fraction = currentCost > 0 ? cumCost / currentCost : 0;
      const estValue = i < keys.length - 1 ? fraction * currentValue * 0.95 : currentValue;
      const [y, m] = key.split('-');
      const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const label = `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
      return { label, value: parseFloat(estValue.toFixed(2)), cost: parseFloat(cumCost.toFixed(2)) };
    });
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
