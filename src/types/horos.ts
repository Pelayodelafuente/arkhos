// ── Core entities ──────────────────────────────────────────────────────────

export interface HorosPosition {
  id: string;
  user_id: string;
  fund_name: string;
  isin: string;
  account_code: string | null;
  shares: number;
  nav_price: number;
  nav_date: string;
  total_value: number;
  total_cost: number;
  unrealized_gain: number;
  unrealized_gain_pct: number;
  updated_at: string;
}

export type HorosTransactionType = 'subscription' | 'redemption';

export interface HorosTransaction {
  id: string;
  user_id: string;
  request_date: string;
  value_date: string;
  type: HorosTransactionType;
  nav_applied: number;
  shares: number;
  amount: number;
  commission: number;
  notes: string | null;
  source: string;
  created_at: string;
}

export interface HorosNavHistory {
  id: string;
  user_id: string;
  nav_date: string;
  nav_price: number;
  portfolio_value: number | null;
  created_at: string;
}

export type HorosDistributionDimension = 'sector' | 'geography';

export interface HorosFundDistribution {
  id: string;
  user_id: string;
  report_date: string;
  dimension: HorosDistributionDimension;
  category: string;
  percentage: number;
  created_at: string;
}

export interface HorosAnnualCosts {
  id: string;
  user_id: string;
  year: number;
  management_fee: number | null;
  custody_fee: number | null;
  other_fees: number | null;
  operation_costs: number | null;
  total_costs: number | null;
  total_pct: number | null;
  created_at: string;
}

export interface HorosMonthlyPlan {
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

export interface HorosOverview {
  total_value: number;
  total_cost: number;
  shares: number;
  nav_price: number;
  nav_date: string;
  unrealized_gain: number;
  unrealized_gain_pct: number;
  avg_nav: number;
  nav_gain_per_share: number;
  isin: string;
  fund_name: string;
}

export interface HorosTransactionPerformance {
  transaction: HorosTransaction;
  current_value: number;
  gain: number;
  gain_pct: number;
}

export interface HorosDCAPoint {
  label: string;
  nav_applied: number;
  amount: number;
  shares: number;
  date: string;
}

export interface HorosPortfolioPoint {
  label: string;
  portfolio_value: number | null;
  cumulative_invested: number;
  nav_date: string;
}

export interface HorosProjectionPoint {
  year: number;
  label: string;
  projected_value: number;
  total_contributed: number;
  interest_earned: number;
}
