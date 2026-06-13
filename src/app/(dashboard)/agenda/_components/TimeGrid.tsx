"use client"

import { useMemo } from "react"
import type { CronosItem } from "@/types/agenda"
import { dayKey, formatTime, isToday } from "@/lib/agenda/dates"
import { EventChip } from "./EventChip"

const HOUR_HEIGHT = 44 // px por hora
const DAY_HEIGHT = HOUR_HEIGHT * 24

const weekdayFmt = new Intl.DateTimeFormat("es-ES", { weekday: "short" })

interface Props {
  days: Date[] // 1 (día) o 7 (semana)
  items: CronosItem[]
  onSelect: (item: CronosItem) => void
  onSlotClick: (date: Date) => void
}

interface Positioned {
  item: CronosItem
  col: number
  cols: number
}

/** Reparte items solapados en columnas dentro de un día. */
function layoutColumns(items: CronosItem[]): Positioned[] {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start))
  const result: Positioned[] = []
  let cluster: CronosItem[] = []
  let clusterEnd = -Infinity

  const flush = () => {
    const cols: CronosItem[][] = []
    for (const it of cluster) {
      let placed = false
      for (const c of cols) {
        const last = c[c.length - 1]
        if (new Date(last.end).getTime() <= new Date(it.start).getTime()) {
          c.push(it)
          placed = true
          break
        }
      }
      if (!placed) cols.push([it])
    }
    cols.forEach((c, ci) =>
      c.forEach((it) => result.push({ item: it, col: ci, cols: cols.length }))
    )
    cluster = []
  }

  for (const it of sorted) {
    const s = new Date(it.start).getTime()
    if (cluster.length && s >= clusterEnd) flush()
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, new Date(it.end).getTime())
  }
  flush()
  return result
}

function minutesFromMidnight(iso: string, day: Date): number {
  const d = new Date(iso)
  const midnight = new Date(day)
  midnight.setHours(0, 0, 0, 0)
  return Math.max(0, (d.getTime() - midnight.getTime()) / 60000)
}

export function TimeGrid({ days, items, onSelect, onSlotClick }: Props) {
  const single = days.length === 1

  const perDay = useMemo(() => {
    return days.map((day) => {
      const k = dayKey(day.toISOString())
      const dayItems = items.filter((it) => dayKey(it.start) === k)
      return {
        day,
        allDay: dayItems.filter((it) => it.allDay),
        timed: layoutColumns(dayItems.filter((it) => !it.allDay)),
      }
    })
  }, [days, items])

  const hasAllDay = perDay.some((d) => d.allDay.length > 0)

  // Posiciona el scroll a las 7:00 al montar
  const scrollRef = (el: HTMLDivElement | null) => {
    if (el && el.scrollTop === 0) el.scrollTop = 7 * HOUR_HEIGHT
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Cabecera de días */}
      <div
        className="grid border-b border-border"
        style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day) => {
          const today = isToday(day.toISOString())
          return (
            <div key={day.toISOString()} className="px-2 py-2 text-center">
              <div className="text-[11px] uppercase text-text-tertiary">
                {weekdayFmt.format(day).replace(".", "")}
              </div>
              <div
                className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  today ? "font-semibold text-white" : "text-foreground"
                }`}
                style={today ? { backgroundColor: "var(--module-agenda)" } : undefined}
              >
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Franja de todo el día */}
      {hasAllDay && (
        <div
          className="grid border-b border-border bg-sand/30"
          style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)` }}
        >
          <div className="px-1 py-1 text-right text-[10px] text-text-tertiary">Día</div>
          {perDay.map(({ day, allDay }) => (
            <div key={day.toISOString()} className="flex flex-col gap-0.5 border-l border-border p-1">
              {allDay.map((it) => (
                <EventChip key={it.id} item={it} onSelect={onSelect} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Rejilla horaria */}
      <div ref={scrollRef} className="max-h-[64vh] overflow-y-auto">
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)`, height: DAY_HEIGHT }}
        >
          {/* Columna de horas */}
          <div className="relative">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-text-tertiary"
                style={{ top: h * HOUR_HEIGHT }}
              >
                {h > 0 ? `${String(h).padStart(2, "0")}:00` : ""}
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {perDay.map(({ day, timed }) => {
            const today = isToday(day.toISOString())
            const nowOffset = today
              ? (minutesFromMidnight(new Date().toISOString(), day) / 60) * HOUR_HEIGHT
              : null
            return (
              <div key={day.toISOString()} className="relative border-l border-border">
                {/* Líneas de hora (clic = crear) */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    onClick={() => {
                      const d = new Date(day)
                      d.setHours(h, 0, 0, 0)
                      onSlotClick(d)
                    }}
                    className="cursor-pointer border-b border-border/60 transition-colors hover:bg-sand/40"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Eventos */}
                {timed.map(({ item, col, cols }) => {
                  const top = (minutesFromMidnight(item.start, day) / 60) * HOUR_HEIGHT
                  const durMin =
                    (new Date(item.end).getTime() - new Date(item.start).getTime()) / 60000
                  const height = Math.max((durMin / 60) * HOUR_HEIGHT - 2, 18)
                  const widthPct = 100 / cols
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item)}
                      className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight"
                      style={{
                        top,
                        height,
                        left: `calc(${col * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        backgroundColor: `color-mix(in srgb, ${item.color} 22%, white)`,
                        borderLeft: `3px solid ${item.color}`,
                      }}
                    >
                      <span className="block truncate font-medium text-foreground">
                        {item.title}
                      </span>
                      {height > 30 && (
                        <span className="block truncate text-[10px] text-text-tertiary">
                          {formatTime(item.start)}
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Indicador de ahora */}
                {nowOffset !== null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                    style={{ top: nowOffset }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--error)" }} />
                    <span className="h-px flex-1" style={{ backgroundColor: "var(--error)" }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {single && perDay[0].timed.length === 0 && perDay[0].allDay.length === 0 && (
        <p className="border-t border-border py-3 text-center text-xs text-text-tertiary">
          Sin eventos este día · toca una franja para crear
        </p>
      )}
    </div>
  )
}
