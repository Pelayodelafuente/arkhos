"use client"

import { motion } from "framer-motion"
import type { CronosItem } from "@/types/agenda"
import { dayKey, formatDayHeading, formatTimeRange, isToday } from "@/lib/agenda/dates"

interface Props {
  items: CronosItem[]
  onSelect: (item: CronosItem) => void
}

interface DayGroup {
  key: string
  iso: string
  items: CronosItem[]
}

function groupByDay(items: CronosItem[]): DayGroup[] {
  const map = new Map<string, DayGroup>()
  for (const item of items) {
    const key = dayKey(item.start)
    const group = map.get(key)
    if (group) group.items.push(item)
    else map.set(key, { key, iso: item.start, items: [item] })
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
}

export function AgendaList({ items, onSelect }: Props) {
  const groups = groupByDay(items)

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center">
        <p className="font-heading text-lg text-foreground">Sin eventos próximos</p>
        <p className="max-w-xs text-sm text-text-tertiary">
          Crea tu primer evento o deja que tus proyectos, gastos y mercados lo llenen
          automáticamente.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h3 className="font-heading text-base text-foreground">
              {formatDayHeading(group.iso)}
            </h3>
            {isToday(group.iso) && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--module-agenda) 16%, transparent)",
                  color: "var(--module-agenda)",
                }}
              >
                Hoy
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {group.items.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => onSelect(item)}
                whileHover={{ x: 3 }}
                transition={{ duration: 0.15 }}
                className="group flex items-center gap-3 rounded-xl border border-transparent bg-card px-3 py-2.5 text-left transition-colors hover:border-border"
              >
                <span
                  className="h-9 w-1 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium ${
                      item.completed ? "text-text-tertiary line-through" : "text-foreground"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    {formatTimeRange(item.start, item.end, item.allDay)}
                    {item.location ? ` · ${item.location}` : ""}
                  </p>
                </div>
                {item.recurring && (
                  <span className="flex-shrink-0 text-text-faint" aria-label="Recurrente">
                    ↻
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
