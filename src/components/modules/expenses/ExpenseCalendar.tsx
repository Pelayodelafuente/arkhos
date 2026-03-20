"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { getCalendarDays, getSubscriptionsForDay } from "@/utils/expenses-calendar"
import { ExpenseCalendarCell } from "./ExpenseCalendarCell"
import { ExpenseLegend } from "./ExpenseLegend"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

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
  const subscriptions = useExpensesStore((s) => s.subscriptions)
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
      <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center font-mono text-[11px] uppercase tracking-[0.06em] text-text-tertiary"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid with slide animation */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${year}-${month}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-7 gap-1 sm:gap-2"
        >
          {days.map((day, index) => {
            const daySubs = getSubscriptionsForDay(subscriptions, day.day, year, month)
            const filteredSubs = day.isCurrentMonth ? daySubs : []
            // Column index (0-6) for popover positioning
            const colIndex = index % 7

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
        </motion.div>
      </AnimatePresence>

      <ExpenseLegend onGoToToday={goToToday} />
    </div>
  )
}
