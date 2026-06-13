// ══════════════════════════════════════
// Cronos — Cálculo de rangos y navegación de fechas
// La semana empieza en lunes (ES).
// ══════════════════════════════════════

import type { AgendaViewMode } from '@/types/agenda'

export function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function endOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

/** Lunes 00:00 de la semana que contiene `d`. */
export function startOfWeek(d: Date): Date {
  const r = startOfDay(d)
  const day = (r.getDay() + 6) % 7 // 0 = lunes
  r.setDate(r.getDate() - day)
  return r
}

export function endOfWeek(d: Date): Date {
  const r = startOfWeek(d)
  r.setDate(r.getDate() + 6)
  return endOfDay(r)
}

export function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

/** Rejilla del mes: 6 semanas (42 días) desde el lunes ≤ día 1. */
export function monthGridRange(d: Date): { start: Date; end: Date } {
  const start = startOfWeek(startOfMonth(d))
  const end = endOfDay(addDays(start, 41))
  return { start, end }
}

/** Rango visible que renderiza cada vista. */
export function visibleRange(cursor: Date, view: AgendaViewMode): { start: Date; end: Date } {
  switch (view) {
    case 'month':
      return monthGridRange(cursor)
    case 'week':
      return { start: startOfWeek(cursor), end: endOfWeek(cursor) }
    case 'day':
      return { start: startOfDay(cursor), end: endOfDay(cursor) }
    case 'agenda':
      return { start: startOfDay(cursor), end: endOfDay(addDays(cursor, 60)) }
  }
}

/** Ventana amplia a pedir a la DB (sobre-fetch para navegar sin recargas). */
export function fetchRange(cursor: Date, view: AgendaViewMode): { start: string; end: string } {
  if (view === 'agenda') {
    return {
      start: startOfDay(addDays(cursor, -7)).toISOString(),
      end: endOfDay(addDays(cursor, 90)).toISOString(),
    }
  }
  return {
    start: startOfDay(addMonths(startOfMonth(cursor), -1)).toISOString(),
    end: endOfDay(addMonths(endOfMonth(cursor), 1)).toISOString(),
  }
}

/** Mueve el cursor un período hacia delante/atrás según la vista. */
export function shiftCursor(cursor: Date, view: AgendaViewMode, dir: 1 | -1): Date {
  switch (view) {
    case 'month':
      return addMonths(cursor, dir)
    case 'week':
      return addDays(cursor, 7 * dir)
    case 'day':
      return addDays(cursor, dir)
    case 'agenda':
      return addDays(cursor, 30 * dir)
  }
}

const monthYearFmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
const dayLongFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const dayShortFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Etiqueta del período actual para el header. */
export function periodLabel(cursor: Date, view: AgendaViewMode): string {
  switch (view) {
    case 'month':
      return cap(monthYearFmt.format(cursor))
    case 'week': {
      const s = startOfWeek(cursor)
      const e = endOfWeek(cursor)
      return `${dayShortFmt.format(s)} – ${dayShortFmt.format(e)}`
    }
    case 'day':
      return cap(dayLongFmt.format(cursor))
    case 'agenda':
      return cap(monthYearFmt.format(cursor))
  }
}
