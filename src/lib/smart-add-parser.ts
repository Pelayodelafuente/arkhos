// ══════════════════════════════════════
// Arkhos — Smart Add Parser
// Parses natural language subscription descriptions
// ══════════════════════════════════════

import type { SmartAddParsed, BillingCycle } from '@/types/expenses'

const CYCLE_PATTERNS: Record<string, BillingCycle> = {
  mensual: 'monthly',
  mes: 'monthly',
  monthly: 'monthly',
  trimestral: 'quarterly',
  trim: 'quarterly',
  quarterly: 'quarterly',
  semestral: 'semiannual',
  sem: 'semiannual',
  semiannual: 'semiannual',
  anual: 'annual',
  'año': 'annual',
  annual: 'annual',
  yearly: 'annual',
}

/**
 * Parses a natural language string into subscription fields.
 *
 * Examples:
 * "Netflix 17.99 mensual día 1" → { name: "Netflix", amount: 17.99, cycle: "monthly", billingDay: 1 }
 * "Figma 180 anual día 15 en Herramientas Dev" → { name: "Figma", amount: 180, cycle: "annual", billingDay: 15, category: "Herramientas Dev" }
 * "Adobe 59.99 trimestral día 5" → { name: "Adobe", amount: 59.99, cycle: "quarterly", billingDay: 5 }
 * "Seguro 300 semestral día 1" → { name: "Seguro", amount: 300, cycle: "semiannual", billingDay: 1 }
 */
export function parseSmartAdd(input: string): SmartAddParsed {
  const result: SmartAddParsed = {
    name: null,
    amount: null,
    cycle: null,
    billingDay: null,
    category: null,
  }

  if (!input.trim()) return result

  let text = input.trim()

  // Extract category: "en [category]" or "cat [category]"
  const categoryMatch = text.match(/(?:\ben\s+|cat\s+)([A-Za-zÀ-ÿ\s&]+)$/i)
  if (categoryMatch) {
    result.category = categoryMatch[1].trim()
    text = text.slice(0, categoryMatch.index).trim()
  }

  // Extract billing day: "día X" / "el X" / "d X" / "dia X"
  const dayMatch = text.match(/(?:d[ií]a|el|d)\s+(\d{1,2})/i)
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10)
    if (day >= 1 && day <= 31) {
      result.billingDay = day
    }
    text = text.replace(dayMatch[0], '').trim()
  }

  // Extract cycle
  const cycleRegex = new RegExp(`(?:\\/)?\\b(${Object.keys(CYCLE_PATTERNS).join('|')})\\b`, 'i')
  const cycleMatch = text.match(cycleRegex)
  if (cycleMatch) {
    result.cycle = CYCLE_PATTERNS[cycleMatch[1].toLowerCase()] ?? null
    text = text.replace(cycleMatch[0], '').trim()
  }

  // Extract amount: number with optional decimals (comma or dot)
  const amountMatch = text.match(/(\d+[.,]?\d*)\s*€?/)
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1].replace(',', '.'))
    if (!isNaN(amount) && amount > 0) {
      result.amount = amount
    }
    text = text.replace(amountMatch[0], '').trim()
  }

  // Everything left is the name
  const name = text.replace(/\s+/g, ' ').trim()
  if (name) {
    result.name = name
  }

  return result
}

/**
 * Checks if a parsed result has enough data to create a subscription.
 */
export function isSmartAddComplete(parsed: SmartAddParsed): boolean {
  return parsed.name !== null && parsed.amount !== null
}
