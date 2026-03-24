// ══════════════════════════════════════
// Arkhos — Expenses Calendar Utilities
// Semana: Lunes → Domingo (convención europea)
// Grid: 42 celdas (6 filas × 7 columnas)
// ══════════════════════════════════════

import {
  startOfMonth,
  endOfMonth,
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
 * Filtra suscripciones activas para un día concreto del calendario.
 * - Mensuales: aparecen en su billing_day cada mes.
 * - Anuales: solo aparecen en el mes de su aniversario (basado en started_at).
 *   Si no tienen started_at, se usa billing_day como fallback (comportamiento anterior).
 * Edge case: si el día de cobro excede los días del mes, se asigna al último día.
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

    if (sub.cycle === 'annual') {
      if (!sub.started_at) {
        // Fallback sin started_at: mismo comportamiento que mensual
        const effectiveDay = sub.billing_day > daysInMonth ? daysInMonth : sub.billing_day
        return effectiveDay === day
      }
      // Solo mostrar en el mes de renovación anual
      const startDate = new Date(sub.started_at)
      const renewalMonth = startDate.getMonth() + 1 // 1-based
      if (renewalMonth !== month) return false
      const renewalDay = startDate.getDate()
      const effectiveDay = renewalDay > daysInMonth ? daysInMonth : renewalDay
      return effectiveDay === day
    }

    // Mensual: aparece cada mes en su billing_day
    const effectiveDay = sub.billing_day > daysInMonth ? daysInMonth : sub.billing_day
    return effectiveDay === day
  })
}
