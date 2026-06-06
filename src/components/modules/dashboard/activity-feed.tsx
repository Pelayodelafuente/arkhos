'use client'

import { Skeleton } from '@/components/ui'
import { relativeTime } from '@/lib/utils/format'
import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import type { ActivityData } from './dashboard-view'

interface ActivityFeedProps {
  activity: ActivityData[]
}

const MODULE_META: Record<string, { label: string; color: string }> = {
  proyectos: { label: 'PROYECTOS', color: 'var(--module-proyectos)' },
  gastos: { label: 'GASTOS', color: 'var(--module-gastos)' },
  notas: { label: 'NOTAS', color: 'var(--module-notas)' },
  mercados: { label: 'MERCADOS', color: 'var(--module-mercados)' },
  patrimonio: { label: 'PATRIMONIO', color: 'var(--module-patrimonio)' },
}

function getModuleMeta(module: string): { label: string; color: string } {
  return MODULE_META[module] ?? { label: module.toUpperCase(), color: 'var(--text-tertiary)' }
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  return (
    <DashboardPanel>
      <PanelHeader
        color="var(--accent-terracotta)"
        title="Actividad reciente"
        chip={<ModuleChip label={`${activity.length}`} color="var(--accent-terracotta)" />}
      />
      <div className="px-4 pb-4">
        {activity.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-3 w-3 rounded-full mt-1 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <div
              className="absolute left-[5px] top-0 bottom-0 w-px"
              style={{ backgroundColor: 'var(--border-subtle)' }}
              aria-hidden="true"
            />
            <div className="space-y-4">
              {activity.map((entry, i) => {
                const { label, color } = getModuleMeta(entry.module)
                return (
                  <div
                    key={entry.id}
                    className="relative flex items-start gap-3 animate-fade-in-up pl-4"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span
                      className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full border-2 border-card flex-shrink-0"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground leading-snug">
                        <span className="font-medium">{entry.action}</span>
                        {entry.entity_name && (
                          <span className="text-text-tertiary"> &lsquo;{entry.entity_name}&rsquo;</span>
                        )}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <ModuleChip label={label} color={color} />
                        <span className="text-[10px] text-text-muted">
                          {relativeTime(new Date(entry.created_at))}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardPanel>
  )
}
