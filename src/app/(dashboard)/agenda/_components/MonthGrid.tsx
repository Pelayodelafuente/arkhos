"use client"

import { useMemo } from "react"
import type { CronosItem } from "@/types/agenda"
import { dayKey, isToday } from "@/lib/agenda/dates"
import { addDays, monthGridRange } from "@/lib/agenda/range"
import { EventChip } from "./EventChip"

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"]
const MAX_PER_CELL = 3

interface Props {
  cursor: Date
  items: CronosItem[]
  onSelect: (item: CronosItem) => void
  onDayClick: (date: Date) => void
}

export function MonthGrid({ cursor, items, onSelect, onDayClick }: Props) {
  const { start } = monthGridRange(cursor)
  const month = cursor.getMonth()

  const byDay = useMemo(() => {
    const map = new Map<string, CronosItem[]>()
    for (const it of items) {
      const k = dayKey(it.start)
      const arr = map.get(k)
      if (arr) arr.push(it)
      else map.set(k, [it])
    }
    return map
  }, [items])

  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(start, i)), [start])

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Cabecera de días */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Rejilla */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day.toISOString())
          const dayItems = byDay.get(key) ?? []
          const inMonth = day.getMonth() === month
          const today = isToday(day.toISOString())

          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className="flex min-h-[104px] cursor-pointer flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors last:border-r-0 hover:bg-sand/50"
              style={{ opacity: inMonth ? 1 : 0.4 }}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  today ? "font-semibold text-white" : "text-text-secondary"
                }`}
                style={today ? { backgroundColor: "var(--module-agenda)" } : undefined}
              >
                {day.getDate()}
              </span>

              <div className="flex flex-col gap-0.5">
                {dayItems.slice(0, MAX_PER_CELL).map((it) => (
                  <EventChip key={it.id} item={it} onSelect={onSelect} />
                ))}
                {dayItems.length > MAX_PER_CELL && (
                  <span className="px-1 text-[10px] text-text-tertiary">
                    +{dayItems.length - MAX_PER_CELL} más
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
