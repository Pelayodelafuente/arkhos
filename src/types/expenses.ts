// ══════════════════════════════════════
// Arkhos — Expense Types (v2)
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
  cycle: 'monthly' | 'annual'
  billing_day: number
  is_active: boolean
  status: SubscriptionStatus
  trial_ends_at: string | null
  service_key: string | null
  url: string | null
  notes: string | null
  started_at: string | null
  cancelled_at: string | null
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
  cycle: 'monthly' | 'annual'
  billing_day: number
  is_active?: boolean
  status?: SubscriptionStatus
  trial_ends_at?: string | null
  service_key?: string | null
  url?: string | null
  notes?: string | null
  started_at?: string | null
}

export interface SubscriptionUpdate {
  category_id?: string | null
  name?: string
  icon?: string
  color?: string
  amount?: number
  currency?: string
  cycle?: 'monthly' | 'annual'
  billing_day?: number
  is_active?: boolean
  status?: SubscriptionStatus
  trial_ends_at?: string | null
  service_key?: string | null
  url?: string | null
  notes?: string | null
  started_at?: string | null
  cancelled_at?: string | null
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
  created_at: string
  updated_at: string
}

export interface UserGastosSettingsUpdate {
  monthly_budget?: number | null
  show_annual_prices?: boolean
  list_view_mode?: 'category' | 'chronological'
  collapsed_categories?: string[]
}

// ─── Filtros y UI ─────────────────────

export type CycleFilter = 'all' | 'monthly' | 'annual'

// ─── Resumen financiero ───────────────

export interface ExpenseSummary {
  totalMonthly: number
  totalAnnual: number
  totalMonthlyEstimate: number
  countMonthly: number
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
  cycle: 'monthly' | 'annual' | null
  billingDay: number | null
  category: string | null
}
