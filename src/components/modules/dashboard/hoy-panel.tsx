'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getEvents } from '@/lib/supabase/agenda'
import { expandEvents } from '@/lib/agenda/expand'
import { getAggregatedItems } from '@/lib/agenda/aggregate'
import { startOfDay, endOfDay } from '@/lib/agenda/range'
import { formatTime } from '@/lib/agenda/dates'
import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import type { CronosItem, EventSource } from '@/types/agenda'
import { AGENDA_COLOR } from '@/types/agenda'

interface HoyPanelProps {
  userId: string
}

const SOURCE_LABELS: Record<EventSource, string> = {
  native: 'CRONOS',
  gasto: 'GASTOS',
  proyecto: 'PROYECTOS',
  mercado: 'MERCADOS',
}

export function HoyPanel({ userId }: HoyPanelProps) {
  const [items, setItems] = useState<CronosItem[] | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const now = new Date()
    const start = startOfDay(now)
    const end = endOfDay(now)
    const startIso = start.toISOString()
    const endIso = end.toISOString()

    async function load() {
      try {
        const client = createClient()
        const [events, aggregated] = await Promise.all([
          getEvents(userId, startIso, endIso),
          getAggregatedItems(client, userId, startIso, endIso),
        ])
        if (cancelled) return
        const native = expandEvents(events, start, end)
        const merged = [...native, ...aggregated]
          .filter((i) => new Date(i.end) >= start && new Date(i.start) <= end)
          .sort((a, b) => {
            if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
            return a.start.localeCompare(b.start)
          })
        setItems(merged)
      } catch {
        if (!cancelled) setItems([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  const heading = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <DashboardPanel>
      <PanelHeader
        color={AGENDA_COLOR}
        title="Hoy"
        chip={
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
            {heading}
          </span>
        }
        right={
          <Link
            href="/agenda"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-text-tertiary transition-colors hover:text-accent"
          >
            Ver agenda
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        }
      />
      <div className="px-4 pb-4">
        {items === null ? (
          <div className="space-y-2" aria-hidden="true">
            <div className="h-4 w-2/3 animate-pulse rounded bg-sand" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-sand" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2.5 py-1">
            <CalendarDays size={14} className="flex-shrink-0 text-text-tertiary" aria-hidden="true" />
            <p className="text-xs text-text-tertiary">
              Sin eventos hoy — día despejado.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.slice(0, 6).map((item) => (
              <li key={`${item.source}-${item.id}`} className="flex items-center gap-2.5">
                {item.completed ? (
                  <CheckCircle2
                    size={13}
                    className="flex-shrink-0"
                    style={{ color: item.color }}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                )}
                <span className="w-12 flex-shrink-0 font-mono text-[11px] text-text-tertiary">
                  {item.allDay ? 'Día' : formatTime(item.start)}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-xs ${
                    item.completed ? 'text-text-tertiary line-through' : 'text-foreground'
                  }`}
                >
                  {item.title}
                </span>
                <ModuleChip label={SOURCE_LABELS[item.source]} color={item.color} />
              </li>
            ))}
            {items.length > 6 && (
              <li>
                <Link
                  href="/agenda"
                  className="text-[11px] font-medium text-text-tertiary transition-colors hover:text-accent"
                >
                  +{items.length - 6} más en la agenda
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>
    </DashboardPanel>
  )
}
