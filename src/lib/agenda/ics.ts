// ══════════════════════════════════════
// Cronos — Generador de iCalendar (.ics) para el feed de Proton
// RFC 5545 básico. Eventos nativos (con RRULE) + items agregados (concretos).
// ══════════════════════════════════════

import type { AgendaEvent, CronosItem } from '@/types/agenda'

const pad = (n: number) => String(n).padStart(2, '0')

function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** ISO → 'YYYYMMDDTHHMMSSZ' (UTC). */
function dtUtc(iso: string): string {
  const d = new Date(iso)
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/** ISO → 'YYYYMMDD' (fecha UTC, para eventos de día completo). */
function dtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

function vevent(opts: {
  uid: string
  start: string
  end: string
  allDay: boolean
  summary: string
  description?: string | null
  location?: string | null
  rrule?: string | null
}): string {
  const lines = ['BEGIN:VEVENT', `UID:${opts.uid}@arkhos-cronos`, `DTSTAMP:${dtUtc(new Date().toISOString())}`]
  if (opts.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dtDate(opts.start)}`)
    // En día completo, DTEND es exclusivo: +1 día
    const next = new Date(new Date(opts.end).getTime() + 24 * 60 * 60 * 1000)
    lines.push(`DTEND;VALUE=DATE:${dtDate(next.toISOString())}`)
  } else {
    lines.push(`DTSTART:${dtUtc(opts.start)}`)
    lines.push(`DTEND:${dtUtc(opts.end)}`)
  }
  lines.push(`SUMMARY:${esc(opts.summary)}`)
  if (opts.description) lines.push(`DESCRIPTION:${esc(opts.description)}`)
  if (opts.location) lines.push(`LOCATION:${esc(opts.location)}`)
  if (opts.rrule) lines.push(`RRULE:${opts.rrule}`)
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

/** Construye el documento .ics completo. */
export function buildCalendar(events: AgendaEvent[], aggregated: CronosItem[]): string {
  const head = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arkhos//Cronos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Cronos · Arkhos',
    'X-WR-TIMEZONE:Europe/Madrid',
  ]

  const native = events.map((e) =>
    vevent({
      uid: e.id,
      start: e.start_time,
      end: e.end_time,
      allDay: e.is_all_day,
      summary: e.title,
      description: e.description,
      location: e.location,
      rrule: e.recurrence_rule,
    })
  )

  const extra = aggregated.map((it) =>
    vevent({
      uid: it.id,
      start: it.start,
      end: it.end,
      allDay: it.allDay,
      summary: it.title,
      description: it.description,
    })
  )

  return [...head, ...native, ...extra, 'END:VCALENDAR'].join('\r\n') + '\r\n'
}
