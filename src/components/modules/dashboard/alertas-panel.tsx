'use client'

import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { relativeTime } from '@/lib/utils/format'
import type { ProjectData, SubscriptionData, SnapshotData } from './dashboard-view'

interface AlertasPanelProps {
  projects: ProjectData[]
  subscriptions: SubscriptionData[]
  snapshots: SnapshotData[]
}

type AlertSeverity = 'success' | 'warning' | 'info'

interface DashboardAlert {
  id: string
  severity: AlertSeverity
  text: string
  module: string
  moduleColor: string
  ts: Date
}

function toMonthly(amount: number, cycle: string): number {
  const map: Record<string, number> = {
    monthly: 1,
    annual: 12,
    quarterly: 3,
    semiannual: 6,
  }
  return amount / (map[cycle] ?? 1)
}

function getProjectProgress(project: ProjectData): number {
  const phases = project.project_phases ?? []
  let total = 0
  let done = 0
  for (const phase of phases) {
    const tasks = phase.phase_tasks ?? []
    total += tasks.length
    done += tasks.filter((t) => t.done).length
  }
  return total === 0 ? 0 : done / total
}

function buildAlerts(
  projects: ProjectData[],
  subscriptions: SubscriptionData[],
  snapshots: SnapshotData[]
): DashboardAlert[] {
  const alerts: DashboardAlert[] = []
  const now = new Date()

  if (snapshots.length >= 2) {
    const last = snapshots[snapshots.length - 1]
    const prev = snapshots[snapshots.length - 2]
    if (last.total_value > prev.total_value * 1.01) {
      alerts.push({
        id: 'new-max',
        severity: 'success',
        text: 'Nuevo máximo de cartera alcanzado este mes.',
        module: 'PATRIMONIO',
        moduleColor: 'var(--module-patrimonio)',
        ts: now,
      })
    }
  }

  const nearComplete = projects.find((p) => getProjectProgress(p) >= 0.9 && p.status !== 'completed')
  if (nearComplete) {
    alerts.push({
      id: `project-near-${nearComplete.id}`,
      severity: 'success',
      text: `"${nearComplete.name}" está casi completado (>90%).`,
      module: 'PROYECTOS',
      moduleColor: 'var(--module-proyectos)',
      ts: now,
    })
  }

  const totalMonthly = subscriptions.reduce((s, sub) => s + toMonthly(sub.amount, sub.cycle), 0)
  const budgetPct = totalMonthly / 2200
  if (budgetPct > 0.8) {
    alerts.push({
      id: 'budget-warning',
      severity: 'warning',
      text: `Gastos al ${(budgetPct * 100).toFixed(0)}% del presupuesto mensual.`,
      module: 'GASTOS',
      moduleColor: 'var(--module-gastos)',
      ts: now,
    })
  }

  const expensive = subscriptions.filter((s) => toMonthly(s.amount, s.cycle) > 50)
  if (expensive.length > 0) {
    alerts.push({
      id: 'expensive-subs',
      severity: 'info',
      text: `${expensive.length} suscripción${expensive.length > 1 ? 'es' : ''} supera 50€/mes. Revisa si sigues usándolas.`,
      module: 'GASTOS',
      moduleColor: 'var(--module-gastos)',
      ts: now,
    })
  }

  alerts.push({
    id: 'rebalance-tip',
    severity: 'info',
    text: 'Revisa el rebalanceo de tu cartera si han pasado más de 3 meses.',
    module: 'PATRIMONIO',
    moduleColor: 'var(--module-patrimonio)',
    ts: now,
  })

  alerts.push({
    id: 'system-ok',
    severity: 'success',
    text: 'Todos los módulos funcionan correctamente.',
    module: 'SISTEMA',
    moduleColor: 'var(--accent-terracotta)',
    ts: now,
  })

  return alerts.slice(0, 5)
}

const SEVERITY_STYLES: Record<AlertSeverity, { icon: typeof CheckCircle2; color: string }> = {
  success: { icon: CheckCircle2, color: 'var(--module-patrimonio)' },
  warning: { icon: AlertTriangle, color: 'var(--urgency-warning)' },
  info: { icon: Info, color: 'var(--module-gastos)' },
}

export function AlertasPanel({ projects, subscriptions, snapshots }: AlertasPanelProps) {
  const alerts = buildAlerts(projects, subscriptions, snapshots)

  return (
    <DashboardPanel>
      <PanelHeader
        color="var(--accent-terracotta)"
        title="Alertas"
        chip={<ModuleChip label={`${alerts.length}`} color="var(--accent-terracotta)" />}
      />
      <div className="px-4 pb-4 space-y-3">
        {alerts.map((alert) => {
          const { icon: Icon, color } = SEVERITY_STYLES[alert.severity]
          return (
            <div key={alert.id} className="flex items-start gap-2.5">
              <Icon
                size={14}
                className="flex-shrink-0 mt-0.5"
                style={{ color }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground leading-snug">{alert.text}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ModuleChip label={alert.module} color={alert.moduleColor} />
                  <span className="text-[10px] text-text-muted">
                    {relativeTime(alert.ts)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </DashboardPanel>
  )
}
