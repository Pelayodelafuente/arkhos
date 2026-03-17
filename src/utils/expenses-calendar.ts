// ══════════════════════════════════════
// Arkhos — Expenses Calendar Utilities
// Semana: Lunes → Domingo (convención europea)
// Grid: 42 celdas (6 filas × 7 columnas)
// ══════════════════════════════════════

import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  subDays,
  addDays,
  getDaysInMonth,
  format,
} from 'date-fns'
import type { CalendarDay, SubscriptionWithCategory } from '@/types/expenses'

// Convierte getDay() (0=domingo) a índice lunes-base (0=lunes, 6=domingo)
function mondayBasedWeekday(date: Date): number {
  const day = getDay(date) // 0=domingo, 1=lunes … 6=sábado
  return day === 0 ? 6 : day - 1
}

/**
 * Genera los 42 días del grid del calendario.
 * - Siempre 42 celdas (6 filas × 7 columnas), semana Lunes-Domingo
 * - Los días fuera del mes tienen isCurrentMonth: false
 */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
  // month es 1-based (1=enero … 12=diciembre)
  const firstDay = startOfMonth(new Date(year, month - 1, 1))
  const lastDay = endOfMonth(firstDay)

  // Cuántos días del mes anterior necesitamos para llegar al lunes inicial
  const leadingDays = mondayBasedWeekday(firstDay)

  // Primer día del grid (puede ser del mes anterior)
  const gridStart = subDays(firstDay, leadingDays)

  // Generamos exactamente 42 días
  const days: CalendarDay[] = []
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i)
    days.push({
      date: format(date, 'yyyy-MM-dd'),
      day: date.getDate(),
      isCurrentMonth: date >= firstDay && date <= lastDay,
      weekday: getDay(date), // 0=domingo … 6=sábado (nativo JS)
    })
  }

  return days
}

/**
 * Extrae el número de día de un string 'yyyy-MM-dd'.
 * Ejemplo: '2026-03-17' → 17
 */
export function getDayNumber(date: string): number {
  const parts = date.split('-')
  return parseInt(parts[2] ?? '1', 10)
}

/**
 * Filtra suscripciones activas para un billing_day concreto.
 * Edge case: si billing_day > días del mes actual, la suscripción
 * aparece el último día del mes.
 */
export function getSubscriptionsForDay(
  subscriptions: SubscriptionWithCategory[],
  day: number,
  year: number,
  month: number
): SubscriptionWithCategory[] {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1))

  return subscriptions.filter((sub) => {
    if (!sub.is_active) return false

    // Si billing_day excede los días del mes, se asigna al último día
    const effectiveDay =
      sub.billing_day > daysInMonth ? daysInMonth : sub.billing_day

    return effectiveDay === day
  })
}
