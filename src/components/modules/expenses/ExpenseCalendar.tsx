"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { getCalendarDays, getSubscriptionsForDay } from "@/utils/expenses-calendar"
import { ExpenseCalendarCell } from "./ExpenseCalendarCell"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

interface ExpenseCalendarProps {
  onNewWithDay?: (day: number) => void
}

export function ExpenseCalendar({ onNewWithDay }: ExpenseCalendarProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)

  const calendarRef = useRef<HTMLDivElement>(null)
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const selectedDay = useExpensesStore((s) => s.selectedDay)
  const setSelectedDay = useExpensesStore((s) => s.setSelectedDay)

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
    setSlideDirection('right')
    setTimeout(() => {
      if (month === 1) {
        setMonth(12)
        setYear((y) => y - 1)
      } else {
        setMonth((m) => m - 1)
      }
      setSlideDirection(null)
    }, 50)
  }, [month])

  const nextMonth = useCallback(() => {
    setSlideDirection('left')
    setTimeout(() => {
      if (month === 12) {
        setMonth(1)
        setYear((y) => y + 1)
      } else {
        setMonth((m) => m + 1)
      }
      setSlideDirection(null)
    }, 50)
  }, [month])

  const handleDayClick = useCallback((day: number, hasSubs: boolean) => {
    if (hasSubs) {
      setSelectedDay(selectedDay === day ? null : day)
    } else {
      // BUG-02: Click on empty day opens new subscription modal with day pre-filled
      setSelectedDay(null)
      onNewWithDay?.(day)
    }
  }, [selectedDay, setSelectedDay, onNewWithDay])

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
      <div
        className="grid grid-cols-7 gap-1 sm:gap-2 transition-all duration-300"
        style={{
          opacity: slideDirection ? 0.3 : 1,
          transform: slideDirection === 'left'
            ? 'translateX(-8px)'
            : slideDirection === 'right'
              ? 'translateX(8px)'
              : 'translateX(0)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
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
      </div>
    </div>
  )
}
