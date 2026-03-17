"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { getCalendarDays, getSubscriptionsForDay } from "@/utils/expenses-calendar"
import { ExpenseCalendarCell } from "./ExpenseCalendarCell"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

export function ExpenseCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-based

  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const selectedDay = useExpensesStore((s) => s.selectedDay)
  const setSelectedDay = useExpensesStore((s) => s.setSelectedDay)

  const days = useMemo(() => getCalendarDays(year, month), [year, month])

  const today = now.getDate()
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM", { locale: es })
  // Capitalize first letter
  const monthDisplay = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const handleDayClick = (day: number) => {
    setSelectedDay(selectedDay === day ? null : day)
  }

  return (
    <div>
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

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const daySubs = getSubscriptionsForDay(
            subscriptions,
            day.day,
            year,
            month
          )
          // Only show subscriptions for days in current month
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
            />
          )
        })}
      </div>
    </div>
  )
}
