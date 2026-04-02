// ══════════════════════════════════════
// Arkhos — Gastos Utilities
// Calculations, formatting, date helpers
// ══════════════════════════════════════

import type { SubscriptionWithCategory, ExpenseCategory, BillingCycle } from '@/types/expenses'

// ─── Currency formatter ─────────────

export const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

// ─── Billing info type ───────────────

/**
 * Minimal interface to calculate billing dates.
 * Satisfied by Subscription and SubscriptionWithCategory.
 */
export interface BillingRef {
  billing_day: number
  cycle: BillingCycle
  started_at: string | null
}

// ─── Internal helpers ────────────────

/**
 * Next billing date for a monthly subscription.
 * If billing_day has passed this month, returns next month.
 */
function getMonthlyNextBillingDate(billingDay: number, referenceDate?: Date): Date {
  const today = referenceDate ?? new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  const daysInThisMonth = new Date(year, month + 1, 0).getDate()
  const effectiveDay = Math.min(billingDay, daysInThisMonth)

  const thisMonth = new Date(year, month, effectiveDay)

  if (thisMonth.toDateString() === today.toDateString()) {
    return thisMonth
  }

  if (thisMonth > today) {
    return thisMonth
  }

  const nextMonth = month + 1
  const nextYear = nextMonth > 11 ? year + 1 : year
  const actualMonth = nextMonth > 11 ? 0 : nextMonth
  const daysInNextMonth = new Date(nextYear, actualMonth + 1, 0).getDate()
  const nextEffectiveDay = Math.min(billingDay, daysInNextMonth)

  return new Date(nextYear, actualMonth, nextEffectiveDay)
}

/**
 * Next renewal date for an annual subscription, based on started_at.
 * Iterates yearly anniversaries from started_at until finding a future date.
 */
function getNextAnnualRenewalDate(sub: BillingRef, referenceDate?: Date): Date {
  const today = referenceDate ?? new Date()
  today.setHours(0, 0, 0, 0)

  if (!sub.started_at) {
    console.warn(
      `[gastos-utils] Suscripción anual sin started_at (billing_day=${sub.billing_day}) — usando fallback mensual`
    )
    return getMonthlyNextBillingDate(sub.billing_day, referenceDate)
  }

  const startDate = new Date(sub.started_at)
  let nextRenewal = new Date(startDate)
  nextRenewal.setHours(0, 0, 0, 0)

  while (nextRenewal <= today) {
    nextRenewal = new Date(nextRenewal)
    nextRenewal.setFullYear(nextRenewal.getFullYear() + 1)
  }

  return nextRenewal
}

/**
 * Next billing date for a quarterly subscription (every 3 months from started_at).
 */
function getNextQuarterlyBillingDate(sub: BillingRef, referenceDate?: Date): Date {
  const today = referenceDate ?? new Date()
  today.setHours(0, 0, 0, 0)

  if (!sub.started_at) {
    console.warn(
      `[gastos-utils] Suscripción trimestral sin started_at (billing_day=${sub.billing_day}) — usando fallback mensual`
    )
    return getMonthlyNextBillingDate(sub.billing_day, referenceDate)
  }

  const startDate = new Date(sub.started_at)
  let nextRenewal = new Date(startDate)
  nextRenewal.setHours(0, 0, 0, 0)

  while (nextRenewal <= today) {
    nextRenewal = new Date(nextRenewal)
    nextRenewal.setMonth(nextRenewal.getMonth() + 3)
  }

  return nextRenewal
}

/**
 * Next billing date for a semiannual subscription (every 6 months from started_at).
 */
function getNextSemiannualBillingDate(sub: BillingRef, referenceDate?: Date): Date {
  const today = referenceDate ?? new Date()
  today.setHours(0, 0, 0, 0)

  if (!sub.started_at) {
    console.warn(
      `[gastos-utils] Suscripción semestral sin started_at (billing_day=${sub.billing_day}) — usando fallback mensual`
    )
    return getMonthlyNextBillingDate(sub.billing_day, referenceDate)
  }

  const startDate = new Date(sub.started_at)
  let nextRenewal = new Date(startDate)
  nextRenewal.setHours(0, 0, 0, 0)

  while (nextRenewal <= today) {
    nextRenewal = new Date(nextRenewal)
    nextRenewal.setMonth(nextRenewal.getMonth() + 6)
  }

  return nextRenewal
}

// ─── Date helpers ───────────────────

/**
 * Get the next billing date for a subscription.
 * - monthly: next day X of month (existing logic)
 * - quarterly: next 3-month anniversary of started_at
 * - semiannual: next 6-month anniversary of started_at
 * - annual: next anniversary of started_at
 */
export function getNextBillingDate(sub: BillingRef, referenceDate?: Date): Date {
  switch (sub.cycle) {
    case 'annual':
      return getNextAnnualRenewalDate(sub, referenceDate)
    case 'quarterly':
      return getNextQuarterlyBillingDate(sub, referenceDate)
    case 'semiannual':
      return getNextSemiannualBillingDate(sub, referenceDate)
    default:
      return getMonthlyNextBillingDate(sub.billing_day, referenceDate)
  }
}

/**
 * Get days until next billing for a subscription.
 */
export function getDaysUntilBilling(sub: BillingRef, referenceDate?: Date): number {
  const today = referenceDate ?? new Date()
  today.setHours(0, 0, 0, 0)
  const next = getNextBillingDate(sub, referenceDate)
  next.setHours(0, 0, 0, 0)
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Format relative billing text for a subscription.
 */
export function formatNextBilling(sub: BillingRef): string {
  const next = getNextBillingDate(sub)
  const days = getDaysUntilBilling(sub)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (sub.cycle === 'annual' || sub.cycle === 'quarterly' || sub.cycle === 'semiannual') {
    return next.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return `En ${days} días`
}

/**
 * Check if billing is today for a subscription.
 */
export function isBillingToday(sub: BillingRef): boolean {
  return getDaysUntilBilling(sub) === 0
}

/**
 * Check if billing is tomorrow for a subscription.
 */
export function isBillingTomorrow(sub: BillingRef): boolean {
  return getDaysUntilBilling(sub) === 1
}

// ─── Grouping helpers ───────────────

export interface CategoryGroup {
  category: ExpenseCategory | null
  subscriptions: SubscriptionWithCategory[]
  totalMonthly: number
  totalAnnual: number
  totalQuarterly: number
  totalSemiannual: number
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
        totalQuarterly: 0,
        totalSemiannual: 0,
      })
    }

    const group = groups.get(key)!
    group.subscriptions.push(sub)
    switch (sub.cycle) {
      case 'monthly':
        group.totalMonthly += sub.amount
        break
      case 'quarterly':
        group.totalQuarterly += sub.amount
        break
      case 'semiannual':
        group.totalSemiannual += sub.amount
        break
      case 'annual':
        group.totalAnnual += sub.amount
        break
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (!a.category) return 1
    if (!b.category) return -1
    const totalA = a.totalMonthly + a.totalQuarterly / 3 + a.totalSemiannual / 6 + a.totalAnnual / 12
    const totalB = b.totalMonthly + b.totalQuarterly / 3 + b.totalSemiannual / 6 + b.totalAnnual / 12
    return totalB - totalA
  })
}

// ─── Calculation helpers ─────────────

/**
 * Calculate annualized amount for a subscription.
 */
export function getAnnualizedAmount(sub: SubscriptionWithCategory): number {
  switch (sub.cycle) {
    case 'monthly':
      return sub.amount * 12
    case 'quarterly':
      return sub.amount * 4
    case 'semiannual':
      return sub.amount * 2
    case 'annual':
      return sub.amount
  }
}

/**
 * Calculate monthly equivalent for a subscription.
 */
export function getMonthlyEquivalent(sub: SubscriptionWithCategory): number {
  switch (sub.cycle) {
    case 'monthly':
      return sub.amount
    case 'quarterly':
      return sub.amount / 3
    case 'semiannual':
      return sub.amount / 6
    case 'annual':
      return sub.amount / 12
  }
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
    total: top.totalMonthly + top.totalQuarterly / 3 + top.totalSemiannual / 6 + top.totalAnnual / 12,
    count: top.subscriptions.length,
  }
}

/**
 * Get the next subscription to be billed (closest real billing date).
 */
export function getNextBillingSubscription(
  subscriptions: SubscriptionWithCategory[]
): SubscriptionWithCategory | null {
  const active = subscriptions.filter((s) => s.status === 'active')
  if (active.length === 0) return null

  let closest: SubscriptionWithCategory | null = null
  let minDays = Infinity

  for (const sub of active) {
    const days = getDaysUntilBilling(sub)
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
    const days = getDaysUntilBilling(sub)
    if (days < minDays) {
      minDays = days
      closest = sub
    }
  }

  if (!closest) return null
  return { subscription: closest, daysUntil: minDays }
}

/**
 * Get the next N annual renewals sorted by proximity.
 */
export function getNextAnnualRenewals(
  subscriptions: SubscriptionWithCategory[],
  count = 3
): { subscription: SubscriptionWithCategory; daysUntil: number }[] {
  const annuals = subscriptions.filter((s) => s.status === 'active' && s.cycle === 'annual')
  if (annuals.length === 0) return []

  return annuals
    .map((sub) => ({ subscription: sub, daysUntil: getDaysUntilBilling(sub) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, count)
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

// ─── Cycle labels ────────────────────

/**
 * Get human-readable cycle label in Spanish.
 */
export function getCycleLabel(cycle: BillingCycle): string {
  switch (cycle) {
    case 'monthly':
      return 'Mensual'
    case 'quarterly':
      return 'Trimestral'
    case 'semiannual':
      return 'Semestral'
    case 'annual':
      return 'Anual'
  }
}

/**
 * Get short cycle label for badges.
 */
export function getCycleShortLabel(cycle: BillingCycle): string {
  switch (cycle) {
    case 'monthly':
      return 'Mes'
    case 'quarterly':
      return 'Trim'
    case 'semiannual':
      return 'Sem'
    case 'annual':
      return 'Año'
  }
}

// ─── CSV Export ──────────────────────

export function exportToCSV(subscriptions: SubscriptionWithCategory[], filename: string): void {
  const headers = ['Nombre', 'Categoría', 'Ciclo', 'Precio', 'Día de cobro', 'URL', 'Estado', 'Fecha inicio']
  const rows = subscriptions.map((s) => [
    s.name,
    s.category?.name ?? 'Sin categoría',
    getCycleLabel(s.cycle),
    s.amount.toFixed(2),
    String(s.billing_day),
    s.url ?? '',
    s.status,
    s.started_at ?? '',
  ])

  const monthlyTotal = subscriptions
    .filter((s) => s.status === 'active' && s.cycle === 'monthly')
    .reduce((acc, s) => acc + s.amount, 0)
  const quarterlyTotal = subscriptions
    .filter((s) => s.status === 'active' && s.cycle === 'quarterly')
    .reduce((acc, s) => acc + s.amount, 0)
  const semiannualTotal = subscriptions
    .filter((s) => s.status === 'active' && s.cycle === 'semiannual')
    .reduce((acc, s) => acc + s.amount, 0)
  const annualTotal = subscriptions
    .filter((s) => s.status === 'active' && s.cycle === 'annual')
    .reduce((acc, s) => acc + s.amount, 0)

  rows.push([])
  rows.push(['TOTAL MENSUAL', '', '', monthlyTotal.toFixed(2), '', '', '', ''])
  rows.push(['TOTAL TRIMESTRAL', '', '', quarterlyTotal.toFixed(2), '', '', '', ''])
  rows.push(['TOTAL SEMESTRAL', '', '', semiannualTotal.toFixed(2), '', '', '', ''])
  rows.push(['TOTAL ANUAL', '', '', annualTotal.toFixed(2), '', '', '', ''])
  rows.push([
    'TOTAL ESTIMADO/AÑO',
    '',
    '',
    (monthlyTotal * 12 + quarterlyTotal * 4 + semiannualTotal * 2 + annualTotal).toFixed(2),
    '',
    '',
    '',
    '',
  ])

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
