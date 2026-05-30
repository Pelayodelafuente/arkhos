import type { Database } from '@/lib/supabase/types'

type TransactionType = Database['public']['Enums']['transaction_type']
type PassiveIncomeType = Database['public']['Enums']['passive_income_type']

// TR subtitle keywords (confirmed from live API):
//   "Saving executed"  → savings_plan
//   "Completed" +amt   → transfer_in / transfer_out (amount sign)
//   "Order executed"   → buy (negative) or sell (positive)
const SUBTITLE_TO_TX: Array<[RegExp, TransactionType | 'buy_or_sell' | 'transfer']> = [
  [/saving.?exec|sparplan.*exec|savings.*plan/i, 'savings_plan'],
  [/saveback/i, 'saveback'],
  [/order.?exec|kauf\b|purchase/i, 'buy_or_sell'],
  [/verkauf|sell.*exec|sale/i, 'sell'],
  [/completed/i, 'transfer'],
]

const PASSIVE_KEYWORDS = /dividende|dividend|dividendo|zinsen|interest|interés|saveback|coupon/i

const PASSIVE_PATTERNS: Array<[RegExp, PassiveIncomeType]> = [
  [/dividende|dividend|dividendo/i, 'dividend'],
  [/zinsen|interest|interés/i, 'interest'],
  [/saveback/i, 'saveback'],
  [/coupon/i, 'coupon'],
]

export function classifyTransactionTitle(
  title: string,
  subtitle: string | undefined,
  amount: number
): TransactionType | null {
  const sub = subtitle ?? ''
  for (const [re, type] of SUBTITLE_TO_TX) {
    if (re.test(sub) || re.test(title)) {
      if (type === 'buy_or_sell') return amount < 0 ? 'buy' : 'sell'
      if (type === 'transfer') return amount >= 0 ? 'transfer_in' : 'transfer_out'
      return type
    }
  }
  return null
}

export function classifyPassiveIncomeTitle(
  title: string,
  subtitle: string | undefined
): PassiveIncomeType | null {
  const text = `${title} ${subtitle ?? ''}`
  for (const [pattern, type] of PASSIVE_PATTERNS) {
    if (pattern.test(text)) return type
  }
  return null
}

export function isPassiveIncome(title: string, subtitle?: string): boolean {
  return PASSIVE_KEYWORDS.test(`${title} ${subtitle ?? ''}`)
}

export function parseDecimal(value: string | undefined | null): number {
  if (!value) return 0
  const parsed = parseFloat(value.replace(',', '.'))
  return isNaN(parsed) ? 0 : parsed
}

export function isoDateToDate(timestamp: string): string {
  return new Date(timestamp).toISOString().split('T')[0]
}
