"use client"

import { CalendarPlus } from "lucide-react"
import type { TimeboxTask } from "@/types/agenda"
import { SOURCE_COLORS } from "@/types/agenda"

interface Props {
  tasks: TimeboxTask[]
  onTimebox: (task: TimeboxTask) => void
}

/** Franja de tareas de Proyectos sin programar: click = reservarles un hueco. */
export function UnscheduledStrip({ tasks, onTimebox }: Props) {
  if (tasks.length === 0) return null

  return (
    <div className="mb-4 rounded-xl border border-dashed border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        <CalendarPlus size={13} />
        Sin programar · arrástralas a tu día
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => onTimebox(t)}
            title={t.projectName ? `${t.projectName} · ${t.text}` : t.text}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs transition-all hover:-translate-y-0.5 hover:border-accent"
          >
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: t.color || SOURCE_COLORS.proyecto }}
            />
            <span className="max-w-[180px] truncate text-foreground">{t.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
