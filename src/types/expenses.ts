// ══════════════════════════════════════
// Arkhos — Expense Types
// Módulo Gastos: expense_categories + subscriptions
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
  url?: string | null
  notes?: string | null
  started_at?: string | null
  cancelled_at?: string | null
}

// Subscription con categoría expandida (join)
export interface SubscriptionWithCategory extends Subscription {
  category: ExpenseCategory | null
}

// ─── Filtros y UI ─────────────────────

export type CycleFilter = 'all' | 'monthly' | 'annual'

// ─── Resumen financiero ───────────────

export interface ExpenseSummary {
  totalMonthly: number           // suma suscripciones mensuales activas
  totalAnnual: number            // suma suscripciones anuales activas (precio completo)
  totalMonthlyEstimate: number   // totalMonthly + (totalAnnual / 12)
  countMonthly: number
  countAnnual: number
}

// ─── Calendario ───────────────────────

export interface CalendarDay {
  date: string          // formato 'yyyy-MM-dd'
  day: number           // número del día (1-31)
  isCurrentMonth: boolean
  weekday: number       // 0=domingo … 6=sábado
}
