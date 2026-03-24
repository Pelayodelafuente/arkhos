// ══════════════════════════════════════
// Arkhos — Expenses Data Layer (v2)
// Módulo Gastos: expense_categories + subscriptions + price_history + settings
// ══════════════════════════════════════

import { createBrowserClient } from '@supabase/ssr'
import type {
  ExpenseCategory,
  ExpenseCategoryInsert,
  ExpenseCategoryUpdate,
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
  SubscriptionWithCategory,
  SubscriptionStatus,
  ExpenseSummary,
  PriceHistoryEntry,
  UserGastosSettings,
  UserGastosSettingsUpdate,
  SubscriptionPayment,
  SubscriptionPaymentInsert,
  MonthlySpending,
} from '@/types/expenses'

// ─── Client factory ───────────────────

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Error helper ─────────────────────

class ExpensesError extends Error {
  constructor(message: string, public readonly detail?: string) {
    super(message)
    this.name = 'ExpensesError'
  }
}

// ══════════════════════════════════════
// EXPENSE CATEGORIES
// ══════════════════════════════════════

export async function getExpenseCategories(userId: string): Promise<ExpenseCategory[]> {
  const client = createClient()
  const { data, error } = await client
    .from('expense_categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  if (error) throw new ExpensesError('Error fetching expense categories', error.message)
  return (data ?? []) as ExpenseCategory[]
}

export async function createExpenseCategory(data: ExpenseCategoryInsert): Promise<ExpenseCategory> {
  const client = createClient()
  const { data: row, error } = await client
    .from('expense_categories')
    .insert({
      user_id: data.user_id,
      name: data.name,
      icon: data.icon,
      color: data.color,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) throw new ExpensesError('Error creating expense category', error.message)
  if (!row) throw new ExpensesError('Error creating expense category: no data returned')
  return row as ExpenseCategory
}

export async function updateExpenseCategory(
  id: string,
  data: ExpenseCategoryUpdate
): Promise<ExpenseCategory> {
  const client = createClient()
  const { data: row, error } = await client
    .from('expense_categories')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new ExpensesError('Error updating expense category', error.message)
  if (!row) throw new ExpensesError('Error updating expense category: no data returned')
  return row as ExpenseCategory
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  const client = createClient()
  const { error } = await client.from('expense_categories').delete().eq('id', id)
  if (error) throw new ExpensesError('Error deleting expense category', error.message)
}

// ══════════════════════════════════════
// SUBSCRIPTIONS
// ══════════════════════════════════════

// Mapea el resultado del join a SubscriptionWithCategory
function mapSubscriptionWithCategory(row: Record<string, unknown>): SubscriptionWithCategory {
  const { category, ...rest } = row
  return {
    ...(rest as unknown as Subscription),
    category: (category ?? null) as ExpenseCategory | null,
  }
}

export async function getSubscriptions(userId: string): Promise<SubscriptionWithCategory[]> {
  const client = createClient()
  const { data, error } = await client
    .from('subscriptions')
    .select('*, category:expense_categories(*)')
    .eq('user_id', userId)
    .order('billing_day', { ascending: true })

  if (error) throw new ExpensesError('Error fetching subscriptions', error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(mapSubscriptionWithCategory)
}

export async function getActiveSubscriptions(userId: string): Promise<SubscriptionWithCategory[]> {
  const client = createClient()
  const { data, error } = await client
    .from('subscriptions')
    .select('*, category:expense_categories(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('status', 'active')
    .order('billing_day', { ascending: true })

  if (error) throw new ExpensesError('Error fetching active subscriptions', error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(mapSubscriptionWithCategory)
}

export async function getSubscriptionsByDay(
  userId: string,
  day: number
): Promise<SubscriptionWithCategory[]> {
  const client = createClient()
  const { data, error } = await client
    .from('subscriptions')
    .select('*, category:expense_categories(*)')
    .eq('user_id', userId)
    .eq('billing_day', day)
    .order('billing_day', { ascending: true })

  if (error) throw new ExpensesError('Error fetching subscriptions by day', error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(mapSubscriptionWithCategory)
}

export async function createSubscription(data: SubscriptionInsert): Promise<Subscription> {
  const client = createClient()
  const { data: row, error } = await client
    .from('subscriptions')
    .insert({
      user_id: data.user_id,
      category_id: data.category_id ?? null,
      name: data.name,
      icon: data.icon,
      color: data.color,
      amount: data.amount,
      currency: data.currency ?? 'EUR',
      cycle: data.cycle,
      billing_day: data.billing_day,
      is_active: data.is_active ?? true,
      status: data.status ?? 'active',
      trial_ends_at: data.trial_ends_at ?? null,
      service_key: data.service_key ?? null,
      url: data.url ?? null,
      notes: data.notes ?? null,
      started_at: data.started_at ?? null,
      tags: data.tags ?? [],
    })
    .select()
    .single()

  if (error) throw new ExpensesError('Error creating subscription', error.message)
  if (!row) throw new ExpensesError('Error creating subscription: no data returned')
  return row as Subscription
}

export async function updateSubscription(
  id: string,
  data: SubscriptionUpdate
): Promise<Subscription> {
  const client = createClient()
  const { data: row, error } = await client
    .from('subscriptions')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new ExpensesError('Error updating subscription', error.message)
  if (!row) throw new ExpensesError('Error updating subscription: no data returned')
  return row as Subscription
}

export async function deleteSubscription(id: string): Promise<void> {
  const client = createClient()
  const { error } = await client.from('subscriptions').delete().eq('id', id)
  if (error) throw new ExpensesError('Error deleting subscription', error.message)
}

export async function toggleSubscriptionActive(
  id: string,
  isActive: boolean
): Promise<Subscription> {
  const client = createClient()
  const status: SubscriptionStatus = isActive ? 'active' : 'paused'
  const { data: row, error } = await client
    .from('subscriptions')
    .update({ is_active: isActive, status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new ExpensesError('Error toggling subscription active state', error.message)
  if (!row) throw new ExpensesError('Error toggling subscription: no data returned')
  return row as Subscription
}

export async function updateSubscriptionStatus(
  id: string,
  status: SubscriptionStatus
): Promise<Subscription> {
  const client = createClient()
  const isActive = status === 'active' || status === 'trial'
  const { data: row, error } = await client
    .from('subscriptions')
    .update({ status, is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new ExpensesError('Error updating subscription status', error.message)
  if (!row) throw new ExpensesError('Error updating subscription status: no data returned')
  return row as Subscription
}

// ══════════════════════════════════════
// PRICE HISTORY
// ══════════════════════════════════════

export async function getPriceHistory(subscriptionId: string): Promise<PriceHistoryEntry[]> {
  const client = createClient()
  const { data, error } = await client
    .from('subscription_price_history')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('changed_at', { ascending: false })

  if (error) throw new ExpensesError('Error fetching price history', error.message)
  return (data ?? []) as PriceHistoryEntry[]
}

// ══════════════════════════════════════
// USER GASTOS SETTINGS
// ══════════════════════════════════════

export async function getUserGastosSettings(userId: string): Promise<UserGastosSettings | null> {
  const client = createClient()
  const { data, error } = await client
    .from('user_gastos_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new ExpensesError('Error fetching user gastos settings', error.message)
  return (data as UserGastosSettings) ?? null
}

export async function upsertUserGastosSettings(
  userId: string,
  data: UserGastosSettingsUpdate
): Promise<UserGastosSettings> {
  const client = createClient()
  const { data: row, error } = await client
    .from('user_gastos_settings')
    .upsert(
      {
        user_id: userId,
        ...data,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) throw new ExpensesError('Error upserting user gastos settings', error.message)
  if (!row) throw new ExpensesError('Error upserting user gastos settings: no data returned')
  return row as UserGastosSettings
}

// ══════════════════════════════════════
// SUBSCRIPTION PAYMENTS
// ══════════════════════════════════════

export async function getPayments(
  userId: string,
  from?: string,
  to?: string
): Promise<SubscriptionPayment[]> {
  const client = createClient()
  let query = client
    .from('subscription_payments')
    .select('*')
    .eq('user_id', userId)
    .order('paid_at', { ascending: false })

  if (from) query = query.gte('paid_at', from)
  if (to) query = query.lte('paid_at', to)

  const { data, error } = await query
  if (error) throw new ExpensesError('Error fetching payments', error.message)
  return (data ?? []) as SubscriptionPayment[]
}

export async function getPaymentsBySubscription(
  subscriptionId: string
): Promise<SubscriptionPayment[]> {
  const client = createClient()
  const { data, error } = await client
    .from('subscription_payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('paid_at', { ascending: false })

  if (error) throw new ExpensesError('Error fetching payments by subscription', error.message)
  return (data ?? []) as SubscriptionPayment[]
}

export async function createPayment(
  data: SubscriptionPaymentInsert
): Promise<SubscriptionPayment> {
  const client = createClient()
  const { data: row, error } = await client
    .from('subscription_payments')
    .insert({
      subscription_id: data.subscription_id,
      user_id: data.user_id,
      amount: data.amount,
      currency: data.currency ?? 'EUR',
      paid_at: data.paid_at,
      cycle: data.cycle,
      auto_generated: data.auto_generated ?? false,
      notes: data.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new ExpensesError('Error creating payment', error.message)
  if (!row) throw new ExpensesError('Error creating payment: no data returned')
  return row as SubscriptionPayment
}

export async function deletePayment(id: string): Promise<void> {
  const client = createClient()
  const { error } = await client.from('subscription_payments').delete().eq('id', id)
  if (error) throw new ExpensesError('Error deleting payment', error.message)
}

export async function getMonthlySpending(
  userId: string,
  months: number = 6
): Promise<MonthlySpending[]> {
  const now = new Date()
  const fromDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
  const fromStr = fromDate.toISOString().split('T')[0]

  const payments = await getPayments(userId, fromStr)

  // Aggregate by month
  const map = new Map<string, { total: number; count: number }>()

  // Pre-fill all months so we always have entries
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(key, { total: 0, count: 0 })
  }

  for (const p of payments) {
    const date = new Date(p.paid_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const entry = map.get(key)
    if (entry) {
      entry.total += p.amount
      entry.count += 1
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, total: data.total, count: data.count }))
}

/**
 * Auto-generate payments for the current billing period for each active subscription.
 * Returns the count of newly created payments.
 */
export async function autoGeneratePayments(
  userId: string,
  subscriptions: SubscriptionWithCategory[]
): Promise<number> {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Get all existing payments for this month
  const firstOfMonth = `${currentMonth}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const lastOfMonth = `${currentMonth}-${String(lastDay).padStart(2, '0')}`

  const existingPayments = await getPayments(userId, firstOfMonth, lastOfMonth)
  const existingSubIds = new Set(existingPayments.map((p) => p.subscription_id))

  let created = 0

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue
    if (existingSubIds.has(sub.id)) continue

    // For monthly: always generate if billing_day has passed or is today
    // For others: check if billing falls in current month
    let shouldGenerate = false
    const billingDay = Math.min(sub.billing_day, lastDay)

    if (sub.cycle === 'monthly') {
      shouldGenerate = billingDay <= now.getDate()
    } else {
      // For quarterly/semiannual/annual, check if the subscription bills this month
      if (sub.started_at) {
        const startDate = new Date(sub.started_at)
        const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
        const interval = sub.cycle === 'quarterly' ? 3 : sub.cycle === 'semiannual' ? 6 : 12
        if (monthsDiff >= 0 && monthsDiff % interval === 0 && billingDay <= now.getDate()) {
          shouldGenerate = true
        }
      }
    }

    if (shouldGenerate) {
      const paidAt = `${currentMonth}-${String(billingDay).padStart(2, '0')}`
      await createPayment({
        subscription_id: sub.id,
        user_id: userId,
        amount: sub.amount,
        currency: sub.currency,
        paid_at: paidAt,
        cycle: sub.cycle,
        auto_generated: true,
      })
      created++
    }
  }

  return created
}

// ══════════════════════════════════════
// CALCULATIONS
// ══════════════════════════════════════

export async function getExpenseSummary(userId: string): Promise<ExpenseSummary> {
  const active = await getActiveSubscriptions(userId)

  let totalMonthly = 0
  let totalQuarterly = 0
  let totalSemiannual = 0
  let totalAnnual = 0
  let countMonthly = 0
  let countQuarterly = 0
  let countSemiannual = 0
  let countAnnual = 0

  for (const sub of active) {
    switch (sub.cycle) {
      case 'monthly':
        totalMonthly += sub.amount
        countMonthly++
        break
      case 'quarterly':
        totalQuarterly += sub.amount
        countQuarterly++
        break
      case 'semiannual':
        totalSemiannual += sub.amount
        countSemiannual++
        break
      case 'annual':
        totalAnnual += sub.amount
        countAnnual++
        break
    }
  }

  const totalMonthlyEstimate = totalMonthly + totalQuarterly / 3 + totalSemiannual / 6 + totalAnnual / 12

  return {
    totalMonthly,
    totalQuarterly,
    totalSemiannual,
    totalAnnual,
    totalMonthlyEstimate,
    countMonthly,
    countQuarterly,
    countSemiannual,
    countAnnual,
    countActive: active.length,
  }
}
