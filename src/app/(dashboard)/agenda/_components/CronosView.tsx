"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui"
import { useAgendaStore, selectNativeItems } from "@/stores/agenda-store"
import type { AgendaEvent, CronosItem } from "@/types/agenda"
import { AgendaList } from "./AgendaList"
import { EventModal } from "./EventModal"

interface Props {
  initialEvents: AgendaEvent[]
  userId: string
}

export function CronosView({ initialEvents, userId }: Props) {
  // Hidratación server → cliente (una sola vez)
  useState(() => {
    useAgendaStore.getState().hydrate(initialEvents)
    return true
  })

  const events = useAgendaStore((s) => s.events)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AgendaEvent | null>(null)

  const items = useMemo(() => {
    return selectNativeItems(events).sort((a, b) => a.start.localeCompare(b.start))
  }, [events])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(item: CronosItem) {
    if (item.source !== "native") return
    const ev = events.find((e) => e.id === item.sourceId) ?? null
    setEditing(ev)
    setModalOpen(true)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="mb-8 flex items-end justify-between gap-4">
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
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={16} strokeWidth={2} />
          Nuevo evento
        </Button>
      </header>

      {/* Lista de agenda (las vistas mes/semana/día llegan en la Fase 2) */}
      <AgendaList items={items} onSelect={openEdit} />

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
        editing={editing}
      />
    </div>
  )
}
