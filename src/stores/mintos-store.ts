'use client';

import { create } from 'zustand';
import type {
  MintosOverview,
  MintosDeposit,
  MintosMonthlySnapshot,
  MintosPortfolioHealth,
  MintosDistribution,
  MintosPlan,
  MintosDistributionDimension,
  MintosKPIs,
  MintosHealthSegment,
  MintosEvolutionPoint,
  MintosInterestPoint,
  MintosProjectionPoint,
} from '@/types/mintos';

// ── XIRR via Newton-Raphson ───────────────────────────────────────────────────
function computeXIRR(cashflows: Array<{ date: Date; amount: number }>): number | null {
  if (cashflows.length < 2) return null;
  const sorted = [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();
  const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

  function npv(rate: number): number {
    return sorted.reduce((sum, cf) => {
      const t = (cf.date.getTime() - t0) / MS_PER_YEAR;
      return sum + cf.amount / Math.pow(1 + rate, t);
    }, 0);
  }

  let rate = 0.1;
  for (let i = 0; i < 200; i++) {
    const n = npv(rate);
    if (Math.abs(n) < 1e-8) break;
    const dn = (npv(rate + 1e-7) - n) / 1e-7;
    if (dn === 0) break;
    const next = rate - n / dn;
    if (next <= -1) break;
    if (Math.abs(next - rate) < 1e-12) break;
    rate = next;
  }
  return isFinite(rate) ? parseFloat((rate * 100).toFixed(2)) : null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const HEALTH_COLORS: Record<string, string> = {
  ok: '#3B7A57',
  warn: '#C8A84B',
  orange: '#C4704A',
  red: '#A32D2D',
};

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type ActiveTab = 'dashboard' | 'health' | 'distributions' | 'projection' | 'import' | 'fiscal';

// ── Store ─────────────────────────────────────────────────────────────────────
interface MintosStore {
  // State
  overview: MintosOverview | null;
  deposits: MintosDeposit[];
  monthlySnapshots: MintosMonthlySnapshot[];
  portfolioHealth: MintosPortfolioHealth | null;
  distributions: MintosDistribution[];
  plan: MintosPlan | null;
  isLoading: boolean;
  activeTab: ActiveTab;

  // Actions
  setOverview: (overview: MintosOverview | null) => void;
  setDeposits: (deposits: MintosDeposit[]) => void;
  setMonthlySnapshots: (snapshots: MintosMonthlySnapshot[]) => void;
  setPortfolioHealth: (health: MintosPortfolioHealth | null) => void;
  setDistributions: (distributions: MintosDistribution[]) => void;
  setPlan: (plan: MintosPlan | null) => void;
  setIsLoading: (loading: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;

  // Selectors
  getKPIs: () => MintosKPIs | null;
  getHealthSegments: () => MintosHealthSegment[];
  getEvolutionData: () => MintosEvolutionPoint[];
  getInterestData: () => MintosInterestPoint[];
  getDistributionByDimension: (dim: MintosDistributionDimension) => MintosDistribution[];
  getProjection: (years: number, xirr: number, monthlyContrib: number) => MintosProjectionPoint[];
  getComputedXIRR: () => number | null;
  getTotalDeposited: () => number;
  getLastMonthContribution: () => number | null;
  getFiscalData: () => {
    gross_interest: number;
    taxes_withheld: number;
    commissions: number;
    net_income: number;
  };
}

export const useMintosStore = create<MintosStore>((set, get) => ({
  overview: null,
  deposits: [],
  monthlySnapshots: [],
  portfolioHealth: null,
  distributions: [],
  plan: null,
  isLoading: false,
  activeTab: 'dashboard',

  setOverview: (overview) => set({ overview }),
  setDeposits: (deposits) => set({ deposits }),
  setMonthlySnapshots: (monthlySnapshots) => set({ monthlySnapshots }),
  setPortfolioHealth: (portfolioHealth) => set({ portfolioHealth }),
  setDistributions: (distributions) => set({ distributions }),
  setPlan: (plan) => set({ plan }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab }),

  getKPIs: () => {
    const { overview, deposits, monthlySnapshots } = get();
    if (!overview) return null;

    const totalDeposited = deposits.reduce((s, d) => s + d.amount, 0);
    const netGainPct = totalDeposited > 0 ? (overview.net_gain / totalDeposited) * 100 : 0;

    const health = get().portfolioHealth;
    const totalLoansAmount = health
      ? health.on_track_amount + health.grace_period_amount +
        health.late_1_15_amount + health.late_16_30_amount +
        health.late_31_60_amount + health.default_amount
      : overview.invested_in_loans;
    const moraAmount = health
      ? health.late_1_15_amount + health.late_16_30_amount + health.late_31_60_amount + health.default_amount
      : 0;
    const moraPct = totalLoansAmount > 0 ? (moraAmount / totalLoansAmount) * 100 : 0;

    const sorted = [...monthlySnapshots].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );
    const current = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    const currentInterest = current
      ? current.interest_income + current.buyback_interest + current.late_interest
      : 0;
    const prevInterest = prev
      ? prev.interest_income + prev.buyback_interest + prev.late_interest
      : 0;

    return {
      total_value: overview.total_value,
      net_gain: overview.net_gain,
      net_gain_pct: parseFloat(netGainPct.toFixed(2)),
      xirr: overview.xirr,
      avg_interest_rate: overview.avg_interest_rate,
      total_deposited: totalDeposited,
      current_month_interest: parseFloat(currentInterest.toFixed(4)),
      prev_month_interest: parseFloat(prevInterest.toFixed(4)),
      mora_pct: parseFloat(moraPct.toFixed(2)),
      mora_amount: parseFloat(moraAmount.toFixed(2)),
    };
  },

  getHealthSegments: () => {
    const h = get().portfolioHealth;
    if (!h) return [];

    const total = h.on_track_amount + h.grace_period_amount +
      h.late_1_15_amount + h.late_16_30_amount +
      h.late_31_60_amount + h.default_amount;

    if (total <= 0) return [];

    const seg = (label: string, amount: number, count: number, level: MintosHealthSegment['level']): MintosHealthSegment => ({
      label,
      amount,
      count,
      pct: parseFloat(((amount / total) * 100).toFixed(2)),
      color: HEALTH_COLORS[level],
      level,
    });

    return [
      seg('Al corriente', h.on_track_amount, h.on_track_count, 'ok'),
      seg('Período de gracia', h.grace_period_amount, h.grace_period_count, 'warn'),
      seg('Mora 1-15 días', h.late_1_15_amount, h.late_1_15_count, 'warn'),
      seg('Mora 16-30 días', h.late_16_30_amount, h.late_16_30_count, 'orange'),
      seg('Mora 31-60 días', h.late_31_60_amount, h.late_31_60_count, 'orange'),
      seg('60+ días / Impago', h.default_amount, h.default_count, 'red'),
    ].filter((s) => s.amount > 0 || s.label === '60+ días / Impago');
  },

  getEvolutionData: () => {
    const { monthlySnapshots, overview } = get();
    if (monthlySnapshots.length === 0) return [];

    const sorted = [...monthlySnapshots].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );

    return sorted.map((s, idx) => {
      const isLast = idx === sorted.length - 1;
      const totalValue = isLast && overview
        ? overview.total_value                               // dato real del último mes
        : (s.total_value ?? s.total_deposited);             // estimado mensual
      const netGain = totalValue - s.total_deposited;

      return {
        label: `${MONTHS_SHORT[s.month - 1]} ${s.year}`,
        month: `${s.year}-${String(s.month).padStart(2, '0')}`,
        total_value: parseFloat(totalValue.toFixed(2)),
        total_deposited: s.total_deposited,
        net_gain: parseFloat(netGain.toFixed(2)),
      };
    });
  },

  getInterestData: () => {
    const sorted = [...get().monthlySnapshots].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );

    return sorted.map((s) => {
      const netInterest =
        s.interest_income + s.buyback_interest + s.late_interest - s.commissions - s.taxes_withheld;
      return {
        label: `${MONTHS_SHORT[s.month - 1]} ${s.year}`,
        month: `${s.year}-${String(s.month).padStart(2, '0')}`,
        interest_income: s.interest_income,
        buyback_interest: s.buyback_interest,
        late_interest: s.late_interest,
        net_interest: parseFloat(netInterest.toFixed(4)),
        taxes_withheld: s.taxes_withheld,
      };
    });
  },

  getDistributionByDimension: (dim) => {
    return get().distributions
      .filter((d) => d.dimension === dim && d.amount > 0)
      .sort((a, b) => a.display_order - b.display_order);
  },

  getProjection: (years, xirr, monthlyContrib) => {
    const currentValue = get().overview?.total_value ?? 0;
    const r = xirr / 100;
    const points: MintosProjectionPoint[] = [];

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

  getComputedXIRR: () => {
    const { deposits, overview } = get();
    if (deposits.length === 0 || !overview) return null;

    const cashflows: Array<{ date: Date; amount: number }> = [
      ...deposits.map((d) => ({ date: new Date(d.deposit_date), amount: -d.amount })),
      { date: new Date(overview.snapshot_date), amount: overview.total_value },
    ];

    return computeXIRR(cashflows);
  },

  getTotalDeposited: () => get().deposits.reduce((s, d) => s + d.amount, 0),

  getLastMonthContribution: () => get().plan?.monthly_amount ?? null,

  getFiscalData: () => {
    const snapshots = get().monthlySnapshots;
    const grossInterest = snapshots.reduce(
      (s, m) => s + m.interest_income + m.buyback_interest + m.late_interest,
      0
    );
    const taxesWithheld = snapshots.reduce((s, m) => s + m.taxes_withheld, 0);
    const commissions = snapshots.reduce((s, m) => s + m.commissions, 0);
    const netIncome = grossInterest - taxesWithheld - commissions;
    return {
      gross_interest: parseFloat(grossInterest.toFixed(4)),
      taxes_withheld: parseFloat(taxesWithheld.toFixed(4)),
      commissions: parseFloat(commissions.toFixed(4)),
      net_income: parseFloat(netIncome.toFixed(4)),
    };
  },
}));
