"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui"
import { useAgendaStore } from "@/stores/agenda-store"
import type {
  AgendaEvent,
  AgendaViewMode,
  CronosItem,
  EventSource,
  TimeboxTask,
} from "@/types/agenda"
import { SOURCE_COLORS } from "@/types/agenda"
import { expandEvents } from "@/lib/agenda/expand"
import { fetchRange, periodLabel, shiftCursor, visibleRange } from "@/lib/agenda/range"
import { AgendaList } from "./AgendaList"
import { MonthGrid } from "./MonthGrid"
import { TimeGrid } from "./TimeGrid"
import { EventModal } from "./EventModal"
import { UnscheduledStrip } from "./UnscheduledStrip"
import { addDays } from "@/lib/agenda/range"

interface Props {
  initialEvents: AgendaEvent[]
  initialAggregated: CronosItem[]
  userId: string
}

const VIEW_TABS: { value: AgendaViewMode; label: string }[] = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Día" },
  { value: "agenda", label: "Agenda" },
]

const SOURCE_CHIPS: { value: EventSource; label: string }[] = [
  { value: "native", label: "Eventos" },
  { value: "proyecto", label: "Proyectos" },
  { value: "gasto", label: "Gastos" },
  { value: "mercado", label: "Mercados" },
]

export function CronosView({ initialEvents, initialAggregated, userId }: Props) {
  const router = useRouter()

  // Hidratación server → cliente (una sola vez) + carga de tareas sin programar
  useState(() => {
    const store = useAgendaStore.getState()
    store.hydrate(initialEvents, initialAggregated)
    void store.fetchUnscheduled(userId)
    return true
  })

  const events = useAgendaStore((s) => s.events)
  const aggregated = useAgendaStore((s) => s.aggregated)
  const sourceFilter = useAgendaStore((s) => s.sourceFilter)
  const toggleSource = useAgendaStore((s) => s.toggleSource)
  const viewMode = useAgendaStore((s) => s.viewMode)
  const setViewMode = useAgendaStore((s) => s.setViewMode)
  const selectedDate = useAgendaStore((s) => s.selectedDate)
  const setSelectedDate = useAgendaStore((s) => s.setSelectedDate)
  const fetchEvents = useAgendaStore((s) => s.fetchEvents)
  const fetchAggregated = useAgendaStore((s) => s.fetchAggregated)
  const unscheduled = useAgendaStore((s) => s.unscheduled)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AgendaEvent | null>(null)
  const [createDate, setCreateDate] = useState<string | undefined>(undefined)
  const [prefill, setPrefill] = useState<{ title?: string; taskId?: string } | null>(null)

  const cursor = useMemo(() => new Date(selectedDate), [selectedDate])

  const items = useMemo(() => {
    const range = visibleRange(cursor, viewMode)
    const native = expandEvents(events, range.start, range.end)
    const agg = aggregated.filter(
      (it) => new Date(it.start) >= range.start && new Date(it.start) <= range.end
    )
    return [...native, ...agg]
      .filter((it) => sourceFilter[it.source])
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [events, aggregated, cursor, viewMode, sourceFilter])

  // Carga eventos + agregados del nuevo período (navegación / cambio de vista)
  function loadFor(date: Date, view: AgendaViewMode) {
    const r = fetchRange(date, view)
    void fetchEvents(userId, r.start, r.end)
    void fetchAggregated(userId, r.start, r.end)
  }

  function navigate(dir: 1 | -1) {
    const next = shiftCursor(cursor, viewMode, dir)
    setSelectedDate(next.toISOString())
    loadFor(next, viewMode)
  }

  function goToday() {
    const now = new Date()
    setSelectedDate(now.toISOString())
    loadFor(now, viewMode)
  }

  function changeView(view: AgendaViewMode) {
    setViewMode(view)
    loadFor(cursor, view)
  }

  function openCreate(date?: Date) {
    setEditing(null)
    setPrefill(null)
    setCreateDate(date ? date.toISOString() : selectedDate)
    setModalOpen(true)
  }

  function openTimebox(task: TimeboxTask) {
    setEditing(null)
    setPrefill({ title: task.text, taskId: task.id })
    setCreateDate(selectedDate)
    setModalOpen(true)
  }

  function openEdit(item: CronosItem) {
    // Items virtuales (gasto/proyecto/mercado) → ir a su módulo
    if (item.source !== "native") {
      if (item.href) router.push(item.href)
      return
    }
    const ev = events.find((e) => e.id === item.sourceId) ?? null
    setEditing(ev)
    setModalOpen(true)
  }

  const wide = viewMode === "month" || viewMode === "week"

  return (
    <div className={`mx-auto w-full px-4 py-8 sm:px-6 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span
              className="h-1 w-10 rounded-full"
              style={{ backgroundColor: "var(--module-agenda)" }}
            />
            <h1 className="font-heading text-3xl text-foreground">Cronos</h1>
            <p className="text-sm text-text-tertiary">
              Tu línea de tiempo: eventos, proyectos, gastos y mercados en un solo río.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => openCreate()}>
            <Plus size={16} strokeWidth={2} />
            Nuevo evento
          </Button>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              aria-label="Anterior"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-sand"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToday}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-sand"
            >
              Hoy
            </button>
            <button
              onClick={() => navigate(1)}
              aria-label="Siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-sand"
            >
              <ChevronRight size={16} />
            </button>
            <span className="ml-2 font-heading text-lg text-foreground">
              {periodLabel(cursor, viewMode)}
            </span>
          </div>

          {/* Tabs de vista */}
          <div className="flex gap-1 rounded-xl border border-border p-1">
            {VIEW_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => changeView(t.value)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={
                  viewMode === t.value
                    ? { backgroundColor: "var(--module-agenda)", color: "white" }
                    : { color: "var(--text-secondary)" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros por fuente */}
        <div className="flex flex-wrap gap-2">
          {SOURCE_CHIPS.map((c) => {
            const on = sourceFilter[c.value]
            return (
              <button
                key={c.value}
                onClick={() => toggleSource(c.value)}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
                style={{
                  borderColor: on ? SOURCE_COLORS[c.value] : "var(--border-stone)",
                  backgroundColor: on
                    ? `color-mix(in srgb, ${SOURCE_COLORS[c.value]} 14%, transparent)`
                    : "transparent",
                  color: on ? "var(--text-primary)" : "var(--text-tertiary)",
                  opacity: on ? 1 : 0.6,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[c.value] }}
                />
                {c.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Tareas sin programar (timeboxing) */}
      <UnscheduledStrip tasks={unscheduled} onTimebox={openTimebox} />

      {/* Vista activa */}
      {viewMode === "month" && (
        <MonthGrid cursor={cursor} items={items} onSelect={openEdit} onDayClick={openCreate} />
      )}
      {viewMode === "week" && (
        <TimeGrid
          days={Array.from({ length: 7 }, (_, i) => {
            const monday = new Date(cursor)
            const off = (monday.getDay() + 6) % 7
            monday.setDate(monday.getDate() - off)
            return addDays(monday, i)
          })}
          items={items}
          onSelect={openEdit}
          onSlotClick={openCreate}
        />
      )}
      {viewMode === "day" && (
        <TimeGrid days={[cursor]} items={items} onSelect={openEdit} onSlotClick={openCreate} />
      )}
      {viewMode === "agenda" && <AgendaList items={items} onSelect={openEdit} />}

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
        editing={editing}
        defaultDate={createDate}
        prefillTitle={prefill?.title}
        prefillTaskId={prefill?.taskId ?? null}
      />
    </div>
  )
}
