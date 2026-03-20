// ══════════════════════════════════════
// Arkhos — Gastos Utilities
// Calculations, formatting, date helpers
// ══════════════════════════════════════

import type { SubscriptionWithCategory, ExpenseCategory } from '@/types/expenses'

// ─── Currency formatter ─────────────

export const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

// ─── Date helpers ───────────────────

/**
 * Get the next billing date for a subscription.
 * If the billing day has passed this month, returns next month.
 */
export function getNextBillingDate(billingDay: number, referenceDate?: Date): Date {
  const today = referenceDate ?? new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  // Clamp billing day to days in this month
  const daysInThisMonth = new Date(year, month + 1, 0).getDate()
  const effectiveDay = Math.min(billingDay, daysInThisMonth)

  const thisMonth = new Date(year, month, effectiveDay)

  if (thisMonth.toDateString() === today.toDateString()) {
    return thisMonth // billing is today
  }

  if (thisMonth > today) {
    return thisMonth
  }

  // Next month
  const nextMonth = month + 1
  const nextYear = nextMonth > 11 ? year + 1 : year
  const actualMonth = nextMonth > 11 ? 0 : nextMonth
  const daysInNextMonth = new Date(nextYear, actualMonth + 1, 0).getDate()
  const nextEffectiveDay = Math.min(billingDay, daysInNextMonth)

  return new Date(nextYear, actualMonth, nextEffectiveDay)
}

/**
 * Get days until next billing.
 */
export function getDaysUntilBilling(billingDay: number, referenceDate?: Date): number {
  const today = referenceDate ?? new Date()
  today.setHours(0, 0, 0, 0)
  const next = getNextBillingDate(billingDay, referenceDate)
  next.setHours(0, 0, 0, 0)
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Format relative billing text.
 */
export function formatNextBilling(billingDay: number): string {
  const days = getDaysUntilBilling(billingDay)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (days <= 7) return `En ${days} días`
  return `En ${days} días`
}

/**
 * Check if billing is today.
 */
export function isBillingToday(billingDay: number): boolean {
  return getDaysUntilBilling(billingDay) === 0
}

/**
 * Check if billing is tomorrow.
 */
export function isBillingTomorrow(billingDay: number): boolean {
  return getDaysUntilBilling(billingDay) === 1
}

// ─── Grouping helpers ───────────────

export interface CategoryGroup {
  category: ExpenseCategory | null
  subscriptions: SubscriptionWithCategory[]
  totalMonthly: number
  totalAnnual: number
}

/**
 * Group subscriptions by category.
 */
export function groupByCategory(subscriptions: SubscriptionWithCategory[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>()

  for (const sub of subscriptions) {
    const key = sub.category_id ?? '__uncategorized__'

    if (!groups.has(key)) {
      groups.set(key, {
        category: sub.category,
        subscriptions: [],
        totalMonthly: 0,
        totalAnnual: 0,
      })
    }

    const group = groups.get(key)!
    group.subscriptions.push(sub)
    if (sub.cycle === 'monthly') {
      group.totalMonthly += sub.amount
    } else {
      group.totalAnnual += sub.amount
    }
  }

  // Sort: categories with most spending first, uncategorized last
  return Array.from(groups.values()).sort((a, b) => {
    if (!a.category) return 1
    if (!b.category) return -1
    const totalA = a.totalMonthly + a.totalAnnual / 12
    const totalB = b.totalMonthly + b.totalAnnual / 12
    return totalB - totalA
  })
}

// ─── Calculation helpers ─────────────

/**
 * Calculate annualized amount for a subscription.
 */
export function getAnnualizedAmount(sub: SubscriptionWithCategory): number {
  return sub.cycle === 'monthly' ? sub.amount * 12 : sub.amount
}

/**
 * Calculate monthly equivalent for a subscription.
 */
export function getMonthlyEquivalent(sub: SubscriptionWithCategory): number {
  return sub.cycle === 'monthly' ? sub.amount : sub.amount / 12
}

/**
 * Get the most expensive category.
 */
export function getMostExpensiveCategory(
  subscriptions: SubscriptionWithCategory[]
): { category: ExpenseCategory | null; total: number; count: number } | null {
  const active = subscriptions.filter((s) => s.status === 'active')
  if (active.length === 0) return null

  const groups = groupByCategory(active)
  if (groups.length === 0) return null

  const top = groups[0]
  return {
    category: top.category,
    total: top.totalMonthly + top.totalAnnual / 12,
    count: top.subscriptions.length,
  }
}

/**
 * Get the next subscription to be billed (closest billing day).
 */
export function getNextBillingSubscription(
  subscriptions: SubscriptionWithCategory[]
): SubscriptionWithCategory | null {
  const active = subscriptions.filter((s) => s.status === 'active')
  if (active.length === 0) return null

  let closest: SubscriptionWithCategory | null = null
  let minDays = Infinity

  for (const sub of active) {
    const days = getDaysUntilBilling(sub.billing_day)
    if (days < minDays) {
      minDays = days
      closest = sub
    }
  }

  return closest
}

/**
 * Get the next annual renewal (closest annual subscription to renew).
 */
export function getNextAnnualRenewal(
  subscriptions: SubscriptionWithCategory[]
): { subscription: SubscriptionWithCategory; daysUntil: number } | null {
  const annuals = subscriptions.filter((s) => s.status === 'active' && s.cycle === 'annual')
  if (annuals.length === 0) return null

  let closest: SubscriptionWithCategory | null = null
  let minDays = Infinity

  for (const sub of annuals) {
    const days = getDaysUntilBilling(sub.billing_day)
    if (days < minDays) {
      minDays = days
      closest = sub
    }
  }

  if (!closest) return null
  return { subscription: closest, daysUntil: minDays }
}

// ─── Heat map intensity ─────────────

/**
 * Get heat map intensity class for a day's total spending.
 */
export function getHeatIntensity(totalAmount: number): string {
  if (totalAmount <= 0) return ''
  if (totalAmount <= 20) return 'bg-[rgba(74,122,155,0.05)]'
  if (totalAmount <= 50) return 'bg-[rgba(74,122,155,0.10)]'
  if (totalAmount <= 100) return 'bg-[rgba(74,122,155,0.15)]'
  return 'bg-[rgba(74,122,155,0.20)]'
}

// ─── CSV Export ──────────────────────

export function exportToCSV(subscriptions: SubscriptionWithCategory[], filename: string): void {
  const headers = ['Nombre', 'Categoría', 'Ciclo', 'Precio', 'Día de cobro', 'URL', 'Estado', 'Fecha inicio']
  const rows = subscriptions.map((s) => [
    s.name,
    s.category?.name ?? 'Sin categoría',
    s.cycle === 'monthly' ? 'Mensual' : 'Anual',
    s.amount.toFixed(2),
    String(s.billing_day),
    s.url ?? '',
    s.status,
    s.started_at ?? '',
  ])

  // Summary rows
  const monthlyTotal = subscriptions
    .filter((s) => s.status === 'active' && s.cycle === 'monthly')
    .reduce((acc, s) => acc + s.amount, 0)
  const annualTotal = subscriptions
    .filter((s) => s.status === 'active' && s.cycle === 'annual')
    .reduce((acc, s) => acc + s.amount, 0)

  rows.push([])
  rows.push(['TOTAL MENSUAL', '', '', monthlyTotal.toFixed(2), '', '', '', ''])
  rows.push(['TOTAL ANUAL', '', '', annualTotal.toFixed(2), '', '', '', ''])
  rows.push(['TOTAL ESTIMADO/AÑO', '', '', (monthlyTotal * 12 + annualTotal).toFixed(2), '', '', '', ''])

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
