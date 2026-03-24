// ══════════════════════════════════════
// Arkhos — Duplicate Detection
// Checks for potential duplicate subscriptions
// ══════════════════════════════════════

import type { SubscriptionWithCategory } from '@/types/expenses'

export interface DuplicateCandidate {
  subscription: SubscriptionWithCategory
  reason: string
}

/**
 * Find potential duplicates among existing subscriptions.
 *
 * Checks:
 * 1. Normalized name match (case-insensitive includes)
 * 2. Exact service_key match
 * 3. Amount within ±20%
 */
export function findDuplicates(
  existing: SubscriptionWithCategory[],
  newName: string,
  newAmount?: number,
  newServiceKey?: string
): DuplicateCandidate[] {
  if (!newName.trim()) return []

  const normalizedNew = newName.toLowerCase().trim()
  const candidates: DuplicateCandidate[] = []
  const seen = new Set<string>()

  for (const sub of existing) {
    if (seen.has(sub.id)) continue

    const reasons: string[] = []

    // 1. Name match (case-insensitive includes in either direction)
    const normalizedExisting = sub.name.toLowerCase().trim()
    if (
      normalizedExisting.includes(normalizedNew) ||
      normalizedNew.includes(normalizedExisting)
    ) {
      reasons.push('nombre similar')
    }

    // 2. Service key match
    if (
      newServiceKey &&
      sub.service_key &&
      newServiceKey.toLowerCase() === sub.service_key.toLowerCase()
    ) {
      reasons.push('mismo servicio')
    }

    // Also check icon as service key proxy
    if (
      newServiceKey &&
      sub.icon &&
      newServiceKey.toLowerCase() === sub.icon.toLowerCase()
    ) {
      if (!reasons.includes('mismo servicio')) {
        reasons.push('mismo servicio')
      }
    }

    // 3. Amount within ±20%
    if (newAmount !== undefined && newAmount > 0 && sub.amount > 0) {
      const ratio = newAmount / sub.amount
      if (ratio >= 0.8 && ratio <= 1.2) {
        reasons.push('importe similar')
      }
    }

    // Need at least one name/service match to be a candidate
    if (reasons.includes('nombre similar') || reasons.includes('mismo servicio')) {
      seen.add(sub.id)
      candidates.push({
        subscription: sub,
        reason: reasons.join(', '),
      })
    }
  }

  return candidates
}
