// ══════════════════════════════════════
// Arkhos — Expenses Data Layer
// Módulo Gastos: expense_categories + subscriptions
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
  ExpenseSummary,
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
  const { data: row, error } = await client
    .from('subscriptions')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new ExpensesError('Error toggling subscription active state', error.message)
  if (!row) throw new ExpensesError('Error toggling subscription: no data returned')
  return row as Subscription
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
  }
}
