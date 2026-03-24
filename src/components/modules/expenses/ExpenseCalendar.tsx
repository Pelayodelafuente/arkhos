"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui"
import { useExpensesStore, useCycleFilteredSubscriptions } from "@/stores/expenses-store"
import { getCalendarDays, getSubscriptionsForDay } from "@/utils/expenses-calendar"
import { formatCurrency } from "@/lib/gastos-utils"
import { ExpenseCalendarCell } from "./ExpenseCalendarCell"
import { ExpenseLegend } from "./ExpenseLegend"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ExpenseCalendar({ onNewWithDay }: ExpenseCalendarProps) {
  const now = new Date()
  const [direction, setDirection] = useState(1)

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
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={prevMonth}
          className="border border-border hover:border-accent"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </Button>

        <div className="text-center">
          <span className="font-heading text-[22px] text-foreground">
            {monthDisplay}
          </span>
          <span className="ml-2 font-mono text-[13px] text-text-tertiary">
            {year}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          className="border border-border hover:border-accent"
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-[repeat(7,1fr)_auto] gap-1 sm:gap-2">
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
                <div className="w-12 hidden sm:flex items-center justify-center">
                  {weekTotal > 0 && (
                    <span className="font-mono text-[10px] text-text-tertiary">
                      {formatCurrency(weekTotal)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <ExpenseLegend onGoToToday={goToToday} />
    </div>
  )
}
