// ── Enums ──────────────────────────────────────────────────────────────────

export type IndexaFundType = 'equity' | 'bond' | 'cash';

export type IndexaTransactionType =
  | 'subscription'
  | 'redemption'
  | 'transfer_in'
  | 'transfer_out';

// ── Core entities ──────────────────────────────────────────────────────────

export interface IndexaFund {
  id: string;
  user_id: string;
  name: string;
  isin: string;
  fund_type: IndexaFundType;
  benchmark: string | null;
  annual_cost: number | null;
  currency: string;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export interface IndexaPosition {
  id: string;
  user_id: string;
  fund_id: string | null;
  fund_type: IndexaFundType | null;
  shares: number | null;
  price_per_share: number | null;
  total_value: number;
  total_cost: number;
  unrealized_gain: number;
  allocation_pct: number | null;
  updated_at: string;
  fund?: IndexaFund | null;
}

export interface IndexaTransaction {
  id: string;
  user_id: string;
  fund_id: string | null;
  transaction_date: string;
  value_date: string | null;
  type: IndexaTransactionType;
  shares: number | null;
  price_per_share: number | null;
  amount: number;
  retention: number;
  fiscal_result: number;
  notes: string | null;
  source: 'manual' | 'import_csv';
  created_at: string;
  fund?: IndexaFund | null;
}

export interface IndexaMonthlyReturn {
  id: string;
  user_id: string;
  year: number;
  month: number;
  return_pct: number | null;
  benchmark_pct: number | null;
  cumulative_twr: number | null;
  created_at: string;
}

export interface IndexaMonthlyPlan {
  id: string;
  user_id: string;
  monthly_amount: number;
  execution_day: number;
  is_active: boolean;
  started_at: string | null;
  notes: string | null;
  created_at: string;
}

// ── Computed / view models ──────────────────────────────────────────────────

export interface IndexaOverview {
  total_value: number;
  total_cost: number;
  total_gain: number;
  total_gain_pct: number;
  twr_pct: number | null;
  mwr_pct: number | null;
  volatility_pct: number | null;
  max_drawdown_pct: number | null;
  sharpe_ratio: number | null;
  best_month_pct: number | null;
  worst_month_pct: number | null;
  positions_count: number;
  last_updated: string | null;
}

export interface IndexaMonthlyTableRow {
  year: number;
  months: (number | null)[];
  benchmarks: (number | null)[];
  total: number | null;
}

export interface IndexaProjectionPoint {
  year: number;
  label: string;
  projected_value: number;
  total_contributed: number;
  interest_earned: number;
}
