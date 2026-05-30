import type { Database } from '@/lib/supabase/types'

type TransactionType = Database['public']['Enums']['transaction_type']
type PassiveIncomeType = Database['public']['Enums']['passive_income_type']

// TR timeline item titles contain keywords we use to classify the event type.
// TR does not expose a machine-readable eventType in timelineTransactions.
const TITLE_TO_TRANSACTION_TYPE: Array<[RegExp, TransactionType]> = [
  [/sparplan|savings.?plan|plan de ahorro/i, 'savings_plan'],
  [/saveback/i, 'saveback'],
  [/kauf|buy|compra/i, 'buy'],
  [/verkauf|sell|venta/i, 'sell'],
  [/einzahlung|eingang|transfer.*in|depósito/i, 'transfer_in'],
  [/auszahlung|ausgang|transfer.*out|retiro/i, 'transfer_out'],
  [/dividende|dividend|dividendo/i, 'dividend'],
]

const TITLE_TO_PASSIVE_INCOME_TYPE: Array<[RegExp, PassiveIncomeType]> = [
  [/dividende|dividend|dividendo/i, 'dividend'],
  [/zinsen|interest|interés/i, 'interest'],
  [/saveback/i, 'saveback'],
  [/coupon/i, 'coupon'],
]

export function classifyTransactionTitle(title: string): TransactionType | null {
  for (const [pattern, type] of TITLE_TO_TRANSACTION_TYPE) {
    if (pattern.test(title)) return type
  }
  return null
}

export function classifyPassiveIncomeTitle(title: string): PassiveIncomeType | null {
  for (const [pattern, type] of TITLE_TO_PASSIVE_INCOME_TYPE) {
    if (pattern.test(title)) return type
  }
  return null
}

const PASSIVE_KEYWORDS = /dividende|dividend|dividendo|zinsen|interest|interés|saveback|coupon/i

export function isPassiveIncome(title: string): boolean {
  return PASSIVE_KEYWORDS.test(title)
}

export function parseDecimal(value: string | undefined | null): number {
  if (!value) return 0
  const parsed = parseFloat(value.replace(',', '.'))
  return isNaN(parsed) ? 0 : parsed
}

export function timestampToDate(ms: number): string {
  return new Date(ms).toISOString().split('T')[0]
}
