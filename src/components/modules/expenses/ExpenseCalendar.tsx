"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, CalendarDays, Table2 } from "lucide-react"
import { Button, Card } from "@/components/ui"
import { useExpensesStore, useCycleFilteredSubscriptions } from "@/stores/expenses-store"
import { getCalendarDays, getSubscriptionsForDay } from "@/utils/expenses-calendar"
import { formatCurrency, getCycleShortLabel } from "@/lib/gastos-utils"
import { ExpenseCalendarCell } from "./ExpenseCalendarCell"
import { ExpenseLegend } from "./ExpenseLegend"
import { ServiceAvatar } from "./ServiceAvatar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { SubscriptionWithCategory } from "@/types/expenses"

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

/** Check if a given week row contains today */
function isCurrentWeekRow(weekDays: ReturnType<typeof getCalendarDays>): boolean {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return weekDays.some((d) => d.date === todayStr)
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
}

interface ExpenseCalendarProps {
  onNewWithDay?: (day: number) => void
  onEdit?: (sub: SubscriptionWithCategory) => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ExpenseCalendar({ onNewWithDay, onEdit }: ExpenseCalendarProps) {
  const now = new Date()
  const [direction, setDirection] = useState(1)
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar')

  const calendarRef = useRef<HTMLDivElement>(null)
  const subscriptions = useCycleFilteredSubscriptions()
  const selectedDay = useExpensesStore((s) => s.selectedDay)
  const setSelectedDay = useExpensesStore((s) => s.setSelectedDay)
  const year = useExpensesStore((s) => s.viewedYear)
  const month = useExpensesStore((s) => s.viewedMonth)
  const setViewedMonth = useExpensesStore((s) => s.setViewedMonth)

  const days = useMemo(() => getCalendarDays(year, month), [year, month])

  const today = now.getDate()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM", { locale: es })
  const monthDisplay = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  // BUG-03: Click outside clears selection
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setSelectedDay(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [setSelectedDay])

  const prevMonth = useCallback(() => {
    setDirection(-1)
    if (month === 1) {
      setViewedMonth(year - 1, 12)
    } else {
      setViewedMonth(year, month - 1)
    }
  }, [month, year, setViewedMonth, setDirection])

  const nextMonth = useCallback(() => {
    setDirection(1)
    if (month === 12) {
      setViewedMonth(year + 1, 1)
    } else {
      setViewedMonth(year, month + 1)
    }
  }, [month, year, setViewedMonth, setDirection])

  const goToToday = useCallback(() => {
    const today = new Date()
    setViewedMonth(today.getFullYear(), today.getMonth() + 1)
  }, [setViewedMonth])

  const handleDayClick = useCallback((day: number, hasSubs: boolean) => {
    if (hasSubs) {
      setSelectedDay(selectedDay === day ? null : day)
    } else {
      setSelectedDay(null)
    }
  }, [selectedDay, setSelectedDay])

  return (
    <div ref={calendarRef}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={prevMonth}
          aria-label="Mes anterior"
          className="border border-border hover:border-accent cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </Button>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <span className="font-heading text-[22px] text-foreground">
              {monthDisplay}
            </span>
            <span className="ml-2 font-mono text-[13px] text-text-tertiary">
              {year}
            </span>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-sand p-0.5">
            <button
              onClick={() => setViewMode('calendar')}
              title="Vista calendario"
              className={`flex items-center justify-center h-6 w-6 rounded-md transition-colors cursor-pointer ${viewMode === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              <CalendarDays size={13} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Vista tabla"
              className={`flex items-center justify-center h-6 w-6 rounded-md transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              <Table2 size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          aria-label="Mes siguiente"
          className="border border-border hover:border-accent cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </Button>
      </div>

      {/* Table view */}
      {viewMode === 'table' && (
        <TableView subscriptions={subscriptions} onEdit={onEdit} />
      )}

      {/* Calendar view */}
      {viewMode === 'calendar' && <><div className="mb-1 grid grid-cols-[repeat(7,1fr)_auto] gap-1 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center font-mono text-[11px] uppercase tracking-[0.06em] text-text-tertiary"
          >
            {label}
          </div>
        ))}
        {/* Header for weekly total column */}
        <div className="w-12 text-center font-mono text-[9px] uppercase tracking-[0.06em] text-text-tertiary hidden sm:block">
          Total
        </div>
      </div>

      {/* Calendar grid with slide animation + weekly totals */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${year}-${month}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-1 sm:space-y-2"
        >
          {/* Render 6 rows */}
          {Array.from({ length: 6 }, (_, rowIndex) => {
            const weekDays = days.slice(rowIndex * 7, rowIndex * 7 + 7)
            const isWeekCurrent = isCurrentWeekRow(weekDays)

            // Calculate weekly total
            let weekTotal = 0
            for (const day of weekDays) {
              if (day.isCurrentMonth) {
                const daySubs = getSubscriptionsForDay(subscriptions, day.day, year, month)
                weekTotal += daySubs.reduce((acc, s) => acc + s.amount, 0)
              }
            }

            return (
              <div
                key={rowIndex}
                className={`grid grid-cols-[repeat(7,1fr)_auto] gap-1 sm:gap-2 rounded-lg transition-colors ${
                  isWeekCurrent ? 'bg-sand/40' : ''
                }`}
              >
                {weekDays.map((day, colIndex) => {
                  const daySubs = getSubscriptionsForDay(subscriptions, day.day, year, month)
                  const filteredSubs = day.isCurrentMonth ? daySubs : []

                  return (
                    <ExpenseCalendarCell
                      key={day.date}
                      day={day}
                      subscriptions={filteredSubs}
                      isSelected={selectedDay === day.day && day.isCurrentMonth}
                      isToday={isCurrentMonth && day.day === today && day.isCurrentMonth}
                      onDayClick={handleDayClick}
                      month={month}
                      year={year}
                      colIndex={colIndex}
                    />
                  )
                })}
                {/* Weekly total */}
                <div className="w-12 hidden sm:flex items-center justify-center rounded-md" style={{ background: weekTotal > 0 ? 'var(--bg-sand)' : undefined }}>
                  <span
                    className="font-mono text-[11px] text-text-tertiary tabular-nums leading-tight text-center px-1"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {weekTotal > 0 ? formatCurrency(weekTotal) : '0 €'}
                  </span>
                </div>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <ExpenseLegend onGoToToday={goToToday} />
      </>}
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

interface TableViewProps {
  subscriptions: SubscriptionWithCategory[]
  onEdit?: (sub: SubscriptionWithCategory) => void
}

function TableView({ subscriptions, onEdit }: TableViewProps) {
  const rows = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === 'active' || s.status === 'trial')
      .sort((a, b) => a.billing_day - b.billing_day)
  }, [subscriptions])

  const monthTotal = rows.reduce((acc, s) => acc + s.amount, 0)

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-tertiary">
        Sin suscripciones en este mes
      </div>
    )
  }

  return (
    <Card padding="sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pl-2 pr-3 text-left font-mono text-[10px] uppercase tracking-wider text-text-tertiary w-8">
              Día
            </th>
            <th className="py-2 text-left font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
              Servicio
            </th>
            <th className="py-2 pr-2 text-right font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
              Importe
            </th>
            <th className="py-2 pr-2 text-right font-mono text-[10px] uppercase tracking-wider text-text-tertiary hidden sm:table-cell">
              Ciclo
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((sub) => (
            <tr
              key={sub.id}
              onClick={() => onEdit?.(sub)}
              className={`transition-colors hover:bg-sand/40 ${onEdit ? 'cursor-pointer' : ''}`}
            >
              <td className="py-2 pl-2 pr-3 font-mono text-[12px] text-text-tertiary tabular-nums">
                {sub.billing_day}
              </td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <ServiceAvatar
                    name={sub.name}
                    icon={sub.icon}
                    color={sub.color}
                    size="sm"
                    iconUrl={sub.icon_url}
                    url={sub.url}
                  />
                  <span className="text-[13px] font-medium text-foreground truncate max-w-[140px]">
                    {sub.name}
                  </span>
                </div>
              </td>
              <td className="py-2 pr-2 text-right font-mono text-[12px] text-foreground tabular-nums">
                {formatCurrency(sub.amount)}
              </td>
              <td className="py-2 pr-2 text-right hidden sm:table-cell">
                <span className="text-[10px] text-text-tertiary font-mono">
                  {getCycleShortLabel(sub.cycle)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <td colSpan={2} className="py-2 pl-2 font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
              Total · {rows.length} servicio{rows.length !== 1 ? 's' : ''}
            </td>
            <td className="py-2 pr-2 text-right font-mono text-[12px] font-semibold text-foreground tabular-nums">
              {formatCurrency(monthTotal)}
            </td>
            <td className="hidden sm:table-cell" />
          </tr>
        </tfoot>
      </table>
    </Card>
  )
}

