// ── Core entities ──────────────────────────────────────────────────────────

export interface MintosOverview {
  id: string;
  user_id: string;
  total_value: number;
  invested_in_loans: number;
  cash_balance: number;
  pending_payments: number;
  net_gain: number;
  xirr: number | null;
  avg_interest_rate: number | null;
  active_loans_count: number;
  originators_count: number;
  countries_count: number;
  snapshot_date: string;
  updated_at: string;
}

export interface MintosDeposit {
  id: string;
  user_id: string;
  deposit_date: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface MintosMonthlySnapshot {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_value: number | null;
  total_deposited: number;
  deposits: number;
  interest_income: number;
  capital_received: number;
  buyback_principal: number;
  buyback_interest: number;
  investments: number;
  secondary_market: number;
  late_interest: number;
  commissions: number;
  taxes_withheld: number;
  created_at: string;
  updated_at: string;
}

export interface MintosPortfolioHealth {
  id: string;
  user_id: string;
  on_track_amount: number;
  grace_period_amount: number;
  late_1_15_amount: number;
  late_16_30_amount: number;
  late_31_60_amount: number;
  default_amount: number;
  on_track_count: number;
  grace_period_count: number;
  late_1_15_count: number;
  late_16_30_count: number;
  late_31_60_count: number;
  default_count: number;
  snapshot_date: string;
  updated_at: string;
}

export type MintosDistributionDimension = 'loan_type' | 'term' | 'rate' | 'geography' | 'originator';

export interface MintosDistribution {
  id: string;
  user_id: string;
  dimension: MintosDistributionDimension;
  category: string;
  amount: number;
  percentage: number | null;
  loan_count: number | null;
  display_order: number;
  updated_at: string;
}

export interface MintosPlan {
  id: string;
  user_id: string;
  monthly_amount: number;
  execution_day: number;
  is_active: boolean;
  next_date: string | null;
  notes: string | null;
  started_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Computed / view models ──────────────────────────────────────────────────

export interface MintosKPIs {
  total_value: number;
  net_gain: number;
  net_gain_pct: number;
  xirr: number | null;
  avg_interest_rate: number | null;
  total_deposited: number;
  current_month_interest: number;
  prev_month_interest: number;
  mora_pct: number;
  mora_amount: number;
}

export interface MintosHealthSegment {
  label: string;
  amount: number;
  count: number;
  pct: number;
  color: string;
  level: 'ok' | 'warn' | 'orange' | 'red';
}

export interface MintosEvolutionPoint {
  label: string;
  month: string;        // 'YYYY-MM'
  total_value: number;
  total_deposited: number;
  net_gain: number;
}

export interface MintosInterestPoint {
  label: string;
  month: string;
  interest_income: number;
  buyback_interest: number;
  late_interest: number;
  net_interest: number;
  taxes_withheld: number;
}

export interface MintosProjectionPoint {
  year: number;
  label: string;
  projected_value: number;
  total_contributed: number;
  interest_earned: number;
}

// ── Import types ─────────────────────────────────────────────────────────────

export interface MintosImportRow {
  fecha: string;
  id_operacion: string;
  detalles: string;
  volumen: number;
  saldo: number;
  divisa: string;
  tipo_pago: string;
}

export interface MintosImportResult {
  totalRows: number;
  monthsProcessed: string[];
  depositsFound: number;
  summary: Record<string, number>;
}

// ── Full data load ────────────────────────────────────────────────────────────

export interface MintosFullData {
  overview: MintosOverview | null;
  deposits: MintosDeposit[];
  monthlySnapshots: MintosMonthlySnapshot[];
  portfolioHealth: MintosPortfolioHealth | null;
  distributions: MintosDistribution[];
  plan: MintosPlan | null;
}
