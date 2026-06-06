'use client'

import Link from 'next/link'
import { FolderKanban, Plus } from 'lucide-react'
import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import type { ProjectData } from './dashboard-view'

interface ProyectosPanelProps {
  projects: ProjectData[]
}

function getProgress(project: ProjectData): { done: number; total: number; pct: number } {
  const phases = project.project_phases ?? []
  let total = 0
  let done = 0
  for (const phase of phases) {
    const tasks = phase.phase_tasks ?? []
    total += tasks.length
    done += tasks.filter((t) => t.done).length
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return { done, total, pct }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'ACTIVO', color: 'var(--module-proyectos)' },
  in_progress: { label: 'ACTIVO', color: 'var(--module-proyectos)' },
  paused: { label: 'PAUSADO', color: 'var(--urgency-warning)' },
  completed: { label: 'LISTO', color: 'var(--module-patrimonio)' },
}

function getStatusMeta(status: string): { label: string; color: string } {
  return STATUS_LABELS[status] ?? { label: status.toUpperCase(), color: 'var(--text-tertiary)' }
}

export function ProyectosPanel({ projects }: ProyectosPanelProps) {
  const displayed = projects.slice(0, 3)
  const placeholders = Math.max(0, 3 - displayed.length)

  return (
    <DashboardPanel>
      <PanelHeader
        color="var(--module-proyectos)"
        title="Proyectos"
        chip={<ModuleChip label="PROY" color="var(--module-proyectos)" />}
        right={
          <Link
            href="/proyectos"
            className="text-[10px] text-text-muted hover:text-foreground transition-colors"
          >
            Ver todos
          </Link>
        }
      />
      <div className="px-4 pb-4 space-y-3">
        {displayed.map((project) => {
          const { done, total, pct } = getProgress(project)
          const { label: statusLabel, color: statusColor } = getStatusMeta(project.status)
          const icon = project.icon

          return (
            <div key={project.id} className="p-3 rounded-lg bg-sand border border-border-subtle">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-base leading-none flex-shrink-0 mt-0.5" aria-hidden="true">
                  {icon ?? <FolderKanban size={16} className="text-text-tertiary" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{project.name}</span>
                    <ModuleChip label={statusLabel} color={statusColor} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-xl font-semibold leading-none flex-shrink-0"
                  style={{ color: 'var(--module-proyectos)' }}
                >
                  {pct}%
                </span>
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 rounded-full overflow-hidden bg-white">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: 'var(--module-proyectos)',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted">
                    {done}/{total} tareas completadas
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        {Array.from({ length: placeholders }).map((_, i) => (
          <Link
            key={`placeholder-${i}`}
            href="/proyectos"
            className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border-subtle text-text-muted hover:text-foreground hover:border-border transition-colors"
          >
            <Plus size={14} aria-hidden="true" />
            <span className="text-xs">Nuevo proyecto</span>
          </Link>
        ))}
      </div>
    </DashboardPanel>
  )
}
