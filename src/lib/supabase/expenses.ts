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
// CALCULATIONS
// ══════════════════════════════════════

export async function getExpenseSummary(userId: string): Promise<ExpenseSummary> {
  const active = await getActiveSubscriptions(userId)

  let totalMonthly = 0
  let totalAnnual = 0
  let countMonthly = 0
  let countAnnual = 0

  for (const sub of active) {
    if (sub.cycle === 'monthly') {
      totalMonthly += sub.amount
      countMonthly++
    } else {
      totalAnnual += sub.amount
      countAnnual++
    }
  }

  const totalMonthlyEstimate = totalMonthly + totalAnnual / 12

  return {
    totalMonthly,
    totalAnnual,
    totalMonthlyEstimate,
    countMonthly,
    countAnnual,
    countActive: active.length,
  }
}
