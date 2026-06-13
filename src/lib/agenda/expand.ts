// ══════════════════════════════════════
// Cronos — Expansión de recurrencia a ocurrencias renderizables
// ══════════════════════════════════════

import { rrulestr } from 'rrule'
import type { AgendaEvent, CronosItem } from '@/types/agenda'
import { eventToItem } from '@/lib/supabase/agenda'

function overlaps(startIso: string, endIso: string, rangeStart: Date, rangeEnd: Date): boolean {
  return new Date(endIso) >= rangeStart && new Date(startIso) <= rangeEnd
}

/**
 * Expande los eventos nativos en items de calendario dentro de [rangeStart, rangeEnd].
 * Los eventos no recurrentes se incluyen si solapan el rango; los recurrentes se
 * expanden con su RRULE usando el inicio del evento como ancla y conservando la duración.
 */
export function expandEvents(
  events: AgendaEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CronosItem[] {
  const items: CronosItem[] = []

  for (const e of events) {
    if (!e.recurrence_rule) {
      if (overlaps(e.start_time, e.end_time, rangeStart, rangeEnd)) items.push(eventToItem(e))
      continue
    }

    const dtstart = new Date(e.start_time)
    const duration = new Date(e.end_time).getTime() - dtstart.getTime()

    try {
      const rule = rrulestr(e.recurrence_rule, { dtstart })
      const occurrences = rule.between(rangeStart, rangeEnd, true)
      const base = eventToItem(e)
      for (const occ of occurrences) {
        const startIso = occ.toISOString()
        items.push({
          ...base,
          id: `${e.id}:${startIso}`,
          start: startIso,
          end: new Date(occ.getTime() + duration).toISOString(),
          recurring: true,
        })
      }
    } catch {
      // RRULE inválida: degradar a evento único
      if (overlaps(e.start_time, e.end_time, rangeStart, rangeEnd)) items.push(eventToItem(e))
    }
  }

  return items.sort((a, b) => a.start.localeCompare(b.start))
}
