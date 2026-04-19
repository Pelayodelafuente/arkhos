// ── Core DB entities ──────────────────────────────────────────────────────────

export type CryptoWalletType = 'trust_wallet' | 'metamask' | 'bit2me' | 'aave';
export type CryptoNetwork = 'bitcoin' | 'ethereum' | 'polygon' | 'mainnet';
export type CryptoTransactionType =
  | 'buy'
  | 'sell'
  | 'transfer_in'
  | 'transfer_out'
  | 'staking_reward'
  | 'defi_yield';
export type CryptoTransactionSource = 'import_bit2me' | 'manual' | 'blockchain';

export interface CryptoAsset {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  coingecko_id: string | null;
  wallet_address: string | null;
  wallet_type: CryptoWalletType | null;
  network: CryptoNetwork;
  current_balance: number;
  avg_buy_price_eur: number;
  total_invested_eur: number;
  current_price_eur: number | null;
  price_updated_at: string | null;
  is_active: boolean;
  notes: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface CryptoTransaction {
  id: string;
  user_id: string;
  asset_id: string | null;
  transaction_date: string;
  type: CryptoTransactionType;
  quantity: number | null;
  price_eur: number | null;
  amount_eur: number | null;
  fee_eur: number | null;
  exchange: string | null;
  tx_hash: string | null;
  notes: string | null;
  source: CryptoTransactionSource;
  external_id: string | null;
  created_at: string;
}

export interface CryptoDefiPosition {
  id: string;
  user_id: string;
  asset_id: string | null;
  protocol: string;
  network: string;
  wallet_address: string;
  deposited_amount: number | null;
  current_amount: number | null;
  apy: number | null;
  yield_earned: number | null;
  last_updated: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CryptoMonthlyPlan {
  id: string;
  user_id: string;
  asset_id: string | null;
  monthly_amount_eur: number;
  destination: string | null;
  is_active: boolean;
  started_at: string | null;
  notes: string | null;
}

// ── Computed view models ──────────────────────────────────────────────────────

export interface CryptoAssetWithPL extends CryptoAsset {
  current_value_eur: number;   // current_balance × current_price_eur (or avg fallback)
  pl_eur: number | null;       // null when current_price_eur is unknown
  pl_pct: number | null;       // null when current_price_eur is unknown
  weight_pct: number;          // % of total portfolio value
  has_live_price: boolean;     // true when current_price_eur is not null
}

export interface CryptoOverview {
  total_value_eur: number;
  total_invested_eur: number;
  pl_eur: number | null;       // null when no live prices available
  pl_pct: number | null;       // null when no live prices available
  has_live_prices: boolean;    // true when at least one asset has a live price
  aave_yield_eur: number;
  monthly_plan_eur: number;
}

export interface CryptoDCAPoint {
  date: string;
  label: string;
  price_eur: number;
  amount_eur: number;
  quantity: number;
  is_above_current: boolean;
}

export interface CryptoEvolutionPoint {
  date: string;
  cumulative_invested: number;
}

export interface CryptoTransactionWithAsset extends CryptoTransaction {
  asset: CryptoAsset | null;
  current_value_eur: number | null;
  pl_since_buy_eur: number | null;
  pl_since_buy_pct: number | null;
}

export interface CryptoMonthlyPlanWithAsset extends CryptoMonthlyPlan {
  asset: CryptoAsset | null;
}
