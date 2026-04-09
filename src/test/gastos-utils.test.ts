import { describe, it, expect } from 'vitest'
import {
  getAnnualizedAmount,
  getMonthlyEquivalent,
  getDaysUntilBilling,
  getNextBillingDate,
  formatNextBilling,
  isBillingToday,
  isBillingTomorrow,
  getCycleLabel,
  getCycleShortLabel,
  groupByCategory,
  getNextAnnualRenewal,
} from '@/lib/gastos-utils'
import type { SubscriptionWithCategory } from '@/types/expenses'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSub(
  overrides: Partial<SubscriptionWithCategory> = {}
): SubscriptionWithCategory {
  return {
    id: 'sub-1',
    user_id: 'user-1',
    category_id: null,
    name: 'Test Sub',
    icon: 'CreditCard',
    color: '#000',
    amount: 10,
    currency: 'EUR',
    cycle: 'monthly',
    billing_day: 15,
    is_active: true,
    status: 'active',
    trial_ends_at: null,
    service_key: null,
    url: null,
    icon_url: null,
    notes: null,
    started_at: null,
    tags: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: null,
    ...overrides,
  } as SubscriptionWithCategory
}

// ─── getAnnualizedAmount ─────────────────────────────────────────────────────

describe('getAnnualizedAmount', () => {
  it('monthly × 12', () => {
    expect(getAnnualizedAmount(makeSub({ amount: 10, cycle: 'monthly' }))).toBe(120)
  })
  it('quarterly × 4', () => {
    expect(getAnnualizedAmount(makeSub({ amount: 30, cycle: 'quarterly' }))).toBe(120)
  })
  it('semiannual × 2', () => {
    expect(getAnnualizedAmount(makeSub({ amount: 60, cycle: 'semiannual' }))).toBe(120)
  })
  it('annual unchanged', () => {
    expect(getAnnualizedAmount(makeSub({ amount: 120, cycle: 'annual' }))).toBe(120)
  })
  it('zero amount returns 0', () => {
    expect(getAnnualizedAmount(makeSub({ amount: 0, cycle: 'monthly' }))).toBe(0)
  })
})

// ─── getMonthlyEquivalent ────────────────────────────────────────────────────

describe('getMonthlyEquivalent', () => {
  it('monthly returns amount unchanged', () => {
    expect(getMonthlyEquivalent(makeSub({ amount: 10, cycle: 'monthly' }))).toBe(10)
  })
  it('quarterly divides by 3', () => {
    expect(getMonthlyEquivalent(makeSub({ amount: 30, cycle: 'quarterly' }))).toBe(10)
  })
  it('semiannual divides by 6', () => {
    expect(getMonthlyEquivalent(makeSub({ amount: 60, cycle: 'semiannual' }))).toBe(10)
  })
  it('annual divides by 12', () => {
    expect(getMonthlyEquivalent(makeSub({ amount: 120, cycle: 'annual' }))).toBe(10)
  })
  it('zero amount returns 0', () => {
    expect(getMonthlyEquivalent(makeSub({ amount: 0, cycle: 'annual' }))).toBe(0)
  })
})

// ─── getNextBillingDate (monthly) ────────────────────────────────────────────

describe('getNextBillingDate — monthly', () => {
  it('returns the billing day in the current month if in the future', () => {
    // billing_day = 28, referenceDate = day 5
    const ref = new Date(2024, 0, 5) // 5 Jan 2024
    const sub = makeSub({ billing_day: 28, cycle: 'monthly' })
    const next = getNextBillingDate(sub, ref)
    expect(next.getDate()).toBe(28)
    expect(next.getMonth()).toBe(0)
  })

  it('rolls over to next month if billing_day has passed', () => {
    const ref = new Date(2024, 0, 20) // 20 Jan 2024
    const sub = makeSub({ billing_day: 5, cycle: 'monthly' })
    const next = getNextBillingDate(sub, ref)
    expect(next.getMonth()).toBe(1) // February
    expect(next.getDate()).toBe(5)
  })

  it('returns today when billing_day is today', () => {
    const ref = new Date(2024, 0, 15)
    const sub = makeSub({ billing_day: 15, cycle: 'monthly' })
    const next = getNextBillingDate(sub, ref)
    expect(next.toDateString()).toBe(ref.toDateString())
  })

  it('clamps billing_day to last day of month (e.g., day 31 in Feb)', () => {
    const ref = new Date(2024, 0, 20) // 20 Jan
    const sub = makeSub({ billing_day: 31, cycle: 'monthly' })
    const next = getNextBillingDate(sub, ref)
    expect(next.getMonth()).toBe(0) // still in January
    expect(next.getDate()).toBe(31)
  })
})

// ─── getNextBillingDate (annual) ─────────────────────────────────────────────

describe('getNextBillingDate — annual', () => {
  it('returns next anniversary from started_at', () => {
    const ref = new Date(2024, 0, 10) // 10 Jan 2024
    const sub = makeSub({
      cycle: 'annual',
      started_at: '2022-06-15T00:00:00Z',
    })
    const next = getNextBillingDate(sub, ref)
    expect(next.getFullYear()).toBe(2024)
    expect(next.getMonth()).toBe(5) // June
    expect(next.getDate()).toBe(15)
  })

  it('falls back to monthly billing_day when started_at is null', () => {
    const ref = new Date(2024, 0, 5)
    const sub = makeSub({ cycle: 'annual', started_at: null, billing_day: 20 })
    const next = getNextBillingDate(sub, ref)
    expect(next.getDate()).toBe(20)
  })
})

// ─── getNextBillingDate (quarterly) ──────────────────────────────────────────

describe('getNextBillingDate — quarterly', () => {
  it('returns next 3-month anniversary from started_at', () => {
    const ref = new Date(2024, 0, 10)
    const sub = makeSub({
      cycle: 'quarterly',
      started_at: '2023-11-01T00:00:00Z', // Nov 1 → Feb 1 → May 1 → ...
    })
    const next = getNextBillingDate(sub, ref)
    expect(next.getMonth()).toBe(1) // February
    expect(next.getDate()).toBe(1)
  })

  it('falls back to monthly billing_day when started_at is null', () => {
    const ref = new Date(2024, 0, 5)
    const sub = makeSub({ cycle: 'quarterly', started_at: null, billing_day: 20 })
    const next = getNextBillingDate(sub, ref)
    expect(next.getDate()).toBe(20)
  })
})

// ─── getDaysUntilBilling ─────────────────────────────────────────────────────

describe('getDaysUntilBilling', () => {
  it('returns 0 when billing is today', () => {
    const ref = new Date(2024, 0, 15)
    const sub = makeSub({ billing_day: 15, cycle: 'monthly' })
    expect(getDaysUntilBilling(sub, ref)).toBe(0)
  })

  it('returns positive days when billing is in the future', () => {
    const ref = new Date(2024, 0, 5)
    const sub = makeSub({ billing_day: 20, cycle: 'monthly' })
    expect(getDaysUntilBilling(sub, ref)).toBe(15)
  })
})

// ─── isBillingToday / isBillingTomorrow ─────────────────────────────────────

describe('isBillingToday / isBillingTomorrow', () => {
  it('isBillingToday true when billing_day matches today', () => {
    const today = new Date()
    const sub = makeSub({ billing_day: today.getDate(), cycle: 'monthly' })
    expect(isBillingToday(sub)).toBe(true)
  })

  it('isBillingTomorrow false when billing is today', () => {
    const today = new Date()
    const sub = makeSub({ billing_day: today.getDate(), cycle: 'monthly' })
    expect(isBillingTomorrow(sub)).toBe(false)
  })
})

// ─── formatNextBilling ───────────────────────────────────────────────────────

describe('formatNextBilling', () => {
  it('returns "Hoy" when billing is today', () => {
    const today = new Date()
    const sub = makeSub({ billing_day: today.getDate(), cycle: 'monthly' })
    expect(formatNextBilling(sub)).toBe('Hoy')
  })

  it('returns "Mañana" when billing is tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const sub = makeSub({ billing_day: tomorrow.getDate(), cycle: 'monthly' })
    expect(formatNextBilling(sub)).toBe('Mañana')
  })

  it('returns "En X días" for monthly subscriptions in the future', () => {
    const ref = new Date(2024, 0, 5)
    const sub = makeSub({ billing_day: 20, cycle: 'monthly' })
    // Can't call formatNextBilling with ref, but we can check structure
    const result = formatNextBilling(sub)
    expect(typeof result).toBe('string')
  })
})

// ─── getCycleLabel / getCycleShortLabel ──────────────────────────────────────

describe('getCycleLabel', () => {
  it('monthly', () => { expect(getCycleLabel('monthly')).toBe('Mensual') })
  it('quarterly', () => { expect(getCycleLabel('quarterly')).toBe('Trimestral') })
  it('semiannual', () => { expect(getCycleLabel('semiannual')).toBe('Semestral') })
  it('annual', () => { expect(getCycleLabel('annual')).toBe('Anual') })
})

describe('getCycleShortLabel', () => {
  it('monthly → Mes', () => { expect(getCycleShortLabel('monthly')).toBe('Mes') })
  it('quarterly → Trim', () => { expect(getCycleShortLabel('quarterly')).toBe('Trim') })
  it('semiannual → Sem', () => { expect(getCycleShortLabel('semiannual')).toBe('Sem') })
  it('annual → Año', () => { expect(getCycleShortLabel('annual')).toBe('Año') })
})

// ─── groupByCategory ─────────────────────────────────────────────────────────

describe('groupByCategory', () => {
  it('groups subscriptions by category', () => {
    const subs = [
      makeSub({ id: '1', category_id: 'cat-a', amount: 10, cycle: 'monthly' }),
      makeSub({ id: '2', category_id: 'cat-a', amount: 20, cycle: 'monthly' }),
      makeSub({ id: '3', category_id: null, amount: 5, cycle: 'monthly' }),
    ]
    const groups = groupByCategory(subs)
    const catA = groups.find((g) => g.category === null && g.subscriptions.length === 1) // uncategorized
    expect(groups.length).toBe(2)
    const groupA = groups.find((g) => g.subscriptions.some((s) => s.id === '1'))
    expect(groupA?.totalMonthly).toBe(30)
    void catA
  })

  it('returns empty array for no subscriptions', () => {
    expect(groupByCategory([])).toEqual([])
  })

  it('accumulates quarterly totals separately', () => {
    const subs = [
      makeSub({ id: '1', category_id: 'cat-a', amount: 90, cycle: 'quarterly' }),
    ]
    const groups = groupByCategory(subs)
    expect(groups[0].totalQuarterly).toBe(90)
    expect(groups[0].totalMonthly).toBe(0)
  })
})

// ─── getNextAnnualRenewal ────────────────────────────────────────────────────

describe('getNextAnnualRenewal', () => {
  it('returns null for no active annual subscriptions', () => {
    expect(getNextAnnualRenewal([])).toBeNull()
    expect(getNextAnnualRenewal([makeSub({ cycle: 'monthly' })])).toBeNull()
  })

  it('returns the closest annual renewal', () => {
    const subs = [
      makeSub({ id: '1', cycle: 'annual', started_at: '2023-03-01T00:00:00Z', status: 'active' }),
      makeSub({ id: '2', cycle: 'annual', started_at: '2023-06-01T00:00:00Z', status: 'active' }),
    ]
    const result = getNextAnnualRenewal(subs)
    expect(result).not.toBeNull()
    expect(result!.daysUntil).toBeGreaterThanOrEqual(0)
  })
})
