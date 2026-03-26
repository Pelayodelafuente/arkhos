// ══════════════════════════════════════
// Arkhos — Expense Types (v3)
// Módulo Gastos: categories + subscriptions + price history + settings
// ══════════════════════════════════════

// ─── Expense Categories ───────────────

export interface ExpenseCategory {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ExpenseCategoryInsert {
  user_id: string
  name: string
  icon: string
  color: string
  sort_order?: number
}

export interface ExpenseCategoryUpdate {
  name?: string
  icon?: string
  color?: string
  sort_order?: number
}

// ─── Subscription Status ────────────

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'trial'

// ─── Billing Cycle ──────────────────

export type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'annual'

// ─── Subscriptions ────────────────────

export interface Subscription {
  id: string
  user_id: string
  category_id: string | null
  name: string
  icon: string
  color: string
  amount: number
  currency: string
  cycle: BillingCycle
  billing_day: number
  is_active: boolean
  status: SubscriptionStatus
  trial_ends_at: string | null
  service_key: string | null
  url: string | null
  icon_url: string | null
  notes: string | null
  started_at: string | null
  cancelled_at: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface SubscriptionInsert {
  user_id: string
  category_id?: string | null
  name: string
  icon: string
  color: string
  amount: number
  currency?: string
  cycle: BillingCycle
  billing_day: number
  is_active?: boolean
  status?: SubscriptionStatus
  trial_ends_at?: string | null
  service_key?: string | null
  url?: string | null
  icon_url?: string | null
  notes?: string | null
  started_at?: string | null
  tags?: string[]
}

export interface SubscriptionUpdate {
  category_id?: string | null
  name?: string
  icon?: string
  color?: string
  amount?: number
  currency?: string
  cycle?: BillingCycle
  billing_day?: number
  is_active?: boolean
  status?: SubscriptionStatus
  trial_ends_at?: string | null
  service_key?: string | null
  url?: string | null
  icon_url?: string | null
  notes?: string | null
  started_at?: string | null
  cancelled_at?: string | null
  tags?: string[]
}

// Subscription con categoría expandida (join)
export interface SubscriptionWithCategory extends Subscription {
  category: ExpenseCategory | null
}

// ─── Price History ──────────────────

export interface PriceHistoryEntry {
  id: string
  subscription_id: string
  user_id: string
  old_amount: number
  new_amount: number
  changed_at: string
}

// ─── User Gastos Settings ───────────

export interface UserGastosSettings {
  user_id: string
  monthly_budget: number | null
  default_currency: string
  show_annual_prices: boolean
  list_view_mode: 'category' | 'chronological'
  collapsed_categories: string[]
  alert_days_before: number
  alert_renewal_days: number
  alert_enabled: boolean
  created_at: string
  updated_at: string
}

export interface UserGastosSettingsUpdate {
  monthly_budget?: number | null
  show_annual_prices?: boolean
  list_view_mode?: 'category' | 'chronological'
  collapsed_categories?: string[]
  alert_days_before?: number
  alert_renewal_days?: number
  alert_enabled?: boolean
}

// ─── Subscription Payments ──────────

export interface SubscriptionPayment {
  id: string
  subscription_id: string
  user_id: string
  amount: number
  currency: string
  paid_at: string
  cycle: string
  auto_generated: boolean
  notes: string | null
  created_at: string
}

export interface SubscriptionPaymentInsert {
  subscription_id: string
  user_id: string
  amount: number
  currency?: string
  paid_at: string
  cycle: string
  auto_generated?: boolean
  notes?: string | null
}

export interface MonthlySpending {
  month: string  // 'YYYY-MM'
  total: number
  count: number
}

// ─── Filtros y UI ─────────────────────

export type CycleFilter = 'all' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'

// ─── Resumen financiero ───────────────

export interface ExpenseSummary {
  totalMonthly: number
  totalQuarterly: number
  totalSemiannual: number
  totalAnnual: number
  totalMonthlyEstimate: number
  countMonthly: number
  countQuarterly: number
  countSemiannual: number
  countAnnual: number
  countActive: number
}

// ─── Calendario ───────────────────────

export interface CalendarDay {
  date: string
  day: number
  isCurrentMonth: boolean
  weekday: number
}

// ─── Smart Add parsed result ─────────

export interface SmartAddParsed {
  name: string | null
  amount: number | null
  cycle: BillingCycle | null
  billingDay: number | null
  category: string | null
}
