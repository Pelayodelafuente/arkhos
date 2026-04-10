export type AssetCategory =
  | 'etf_index'
  | 'etf_thematic'
  | 'etf_bond'
  | 'etf_commodity'
  | 'stock_us'
  | 'stock_eu'
  | 'stock_asia'
  | 'fund'
  | 'crypto'
  | 'p2p'
  | 'cash';

export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export type TransactionType =
  | 'buy'
  | 'sell'
  | 'savings_plan'
  | 'saveback'
  | 'dividend'
  | 'transfer_in'
  | 'transfer_out';

export type PassiveIncomeType = 'dividend' | 'interest' | 'saveback' | 'coupon' | 'other';

export type PlatformSlug = 'trade-republic' | 'crypto' | 'indexa' | 'horos' | 'mintos';

export interface InvestmentPlatform {
  id: string;
  user_id: string;
  name: string;
  slug: PlatformSlug;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  notes?: string;
  created_at: string;
}

export interface PortfolioAsset {
  id: string;
  user_id: string;
  platform_id: string;
  name: string;
  ticker?: string;
  isin?: string;
  category: AssetCategory;
  risk_level: RiskLevel;
  sector?: string;
  geographic_region?: string;
  currency: string;
  current_quantity: number;
  avg_buy_price: number;
  total_invested: number;
  current_price?: number;
  current_price_eur?: number;
  price_updated_at?: string;
  is_active: boolean;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Computed fields (populated in JS after fetch)
  platform?: InvestmentPlatform;
  current_value?: number;
  pl_amount?: number;
  pl_percentage?: number;
  // From savings plan join
  monthly_plan_amount?: number;
}

export interface PortfolioTransaction {
  id: string;
  user_id: string;
  asset_id?: string;
  platform_id: string;
  type: TransactionType;
  transaction_date: string;
  quantity?: number;
  price_per_unit?: number;
  total_amount: number;
  currency: string;
  notes?: string;
  source: string;
  external_id?: string;
  created_at: string;
  asset?: PortfolioAsset;
}

export interface SavingsPlanItem {
  id: string;
  user_id: string;
  asset_id: string;
  monthly_amount: number;
  is_active: boolean;
  execution_day: number;
  started_at?: string;
  ended_at?: string;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  asset?: PortfolioAsset;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  platform_id?: string;
  total_value: number;
  total_invested: number;
  cash_value: number;
  pl_amount?: number;
  pl_percentage?: number;
  created_at: string;
}

export interface PassiveIncome {
  id: string;
  user_id: string;
  asset_id?: string;
  platform_id: string;
  type: PassiveIncomeType;
  income_date: string;
  amount: number;
  currency: string;
  notes?: string;
  created_at: string;
  asset?: PortfolioAsset;
}

// Aggregated view models
export interface PlatformSummary {
  platform: InvestmentPlatform;
  total_value: number;
  total_invested: number;
  cash_value: number;
  pl_amount: number;
  pl_percentage: number;
  asset_count: number;
  assets: PortfolioAsset[];
}

export interface PortfolioOverview {
  total_value: number;
  total_invested: number;
  total_cash: number;
  pl_amount: number;
  pl_percentage: number;
  platforms: PlatformSummary[];
  last_updated: string;
}

// Chart data shapes
export interface AllocationSlice {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface EvolutionPoint {
  date: string;
  value: number;
  invested: number;
  pl: number;
}

export interface PLBarItem {
  name: string;
  ticker: string;
  pl_amount: number;
  pl_percentage: number;
  color: string;
}

export interface PassiveIncomeBarItem {
  month: string;
  interest: number;
  dividend: number;
  total: number;
}

export interface PriceUpdate {
  price: number;
  change24h?: number;
  updatedAt: string;
}

export interface PricesResponse {
  prices: Record<string, PriceUpdate>;
}

// Category labels and colors
export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  etf_index: 'ETF Índice',
  etf_thematic: 'ETF Temático',
  etf_bond: 'ETF Bono',
  etf_commodity: 'ETC Commodity',
  stock_us: 'Acción USA',
  stock_eu: 'Acción Europa',
  stock_asia: 'Acción Asia',
  fund: 'Fondo',
  crypto: 'Cripto',
  p2p: 'P2P',
  cash: 'Efectivo',
};

export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  etf_index: '#2E7D6B',
  etf_thematic: '#3B78B0',
  etf_bond: '#7260C4',
  etf_commodity: '#B07A3A',
  stock_us: '#C4704A',
  stock_eu: '#5B8C6A',
  stock_asia: '#E67E22',
  fund: '#9B7A4A',
  crypto: '#B07A3A',
  p2p: '#888780',
  cash: '#C0B8AE',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  very_low: 'Muy bajo',
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  very_high: 'Muy alto',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  very_low: '#6DB33F',
  low: '#2E7D6B',
  medium: '#B07A3A',
  high: '#C4704A',
  very_high: '#A32D2D',
};
