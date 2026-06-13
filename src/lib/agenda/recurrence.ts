// ══════════════════════════════════════
// Cronos — Recurrencia (presets ↔ RRULE iCal)
// Se almacena solo la RRULE (sin DTSTART); el inicio del evento es el ancla.
// ══════════════════════════════════════

export type RecurrencePreset =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'yearly'

export const RECURRENCE_OPTIONS: { value: RecurrencePreset; label: string }[] = [
  { value: 'none', label: 'No se repite' },
  { value: 'daily', label: 'Cada día' },
  { value: 'weekdays', label: 'Entre semana (L–V)' },
  { value: 'weekly', label: 'Cada semana' },
  { value: 'monthly', label: 'Cada mes' },
  { value: 'yearly', label: 'Cada año' },
]

export function presetToRule(p: RecurrencePreset): string | null {
  switch (p) {
    case 'none':
      return null
    case 'daily':
      return 'FREQ=DAILY'
    case 'weekdays':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    case 'weekly':
      return 'FREQ=WEEKLY'
    case 'monthly':
      return 'FREQ=MONTHLY'
    case 'yearly':
      return 'FREQ=YEARLY'
  }
}

export function ruleToPreset(rule: string | null): RecurrencePreset {
  if (!rule) return 'none'
  const r = rule.toUpperCase()
  if (r.includes('BYDAY=MO,TU,WE,TH,FR')) return 'weekdays'
  if (r.includes('FREQ=DAILY')) return 'daily'
  if (r.includes('FREQ=MONTHLY')) return 'monthly'
  if (r.includes('FREQ=YEARLY')) return 'yearly'
  if (r.includes('FREQ=WEEKLY')) return 'weekly'
  return 'none'
}
