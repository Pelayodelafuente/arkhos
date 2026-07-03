import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { formatCurrency } from '@/lib/utils/format'
import type { SubscriptionData } from './dashboard-view'

interface SubWithBilling extends SubscriptionData {
  billing_day: number
  started_at: string | null
}

function daysUntilNext(sub: SubWithBilling): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (sub.cycle === 'monthly') {
    const day = today.getDate()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const effective = Math.min(sub.billing_day, daysInMonth)
    if (effective >= day) return effective - day
    const nextMonthDays = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate()
    return daysInMonth - day + Math.min(sub.billing_day, nextMonthDays)
  }

  // Non-monthly: find next anniversary from started_at
  const monthsIncrement = sub.cycle === 'quarterly' ? 3 : sub.cycle === 'semiannual' ? 6 : 12
  const anchor = sub.started_at ? new Date(sub.started_at) : today
  anchor.setHours(0, 0, 0, 0)

  let next = new Date(anchor)
  while (next <= today) {
    next = new Date(next)
    next.setMonth(next.getMonth() + monthsIncrement)
  }

  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const CYCLE_LABELS: Record<string, string> = {
  annual: 'anual',
  semiannual: 'semestral',
  quarterly: 'trimestral',
}

interface ProximosPagosProps {
  subscriptions: SubscriptionData[]
}

export function ProximosPagosPanel({ subscriptions }: ProximosPagosProps) {
  const subs = subscriptions as SubWithBilling[]

  const upcoming = subs
    .filter((s) => typeof s.billing_day === 'number' || s.started_at)
    .map((s) => ({ ...s, daysLeft: daysUntilNext(s) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5)

  return (
    <DashboardPanel className="flex flex-col">
      <PanelHeader
        color="var(--module-gastos)"
        title="Próximos pagos"
        chip={<ModuleChip label="GAS" color="var(--module-gastos)" />}
      />
      <div className="flex-1 divide-y divide-border/50">
        {upcoming.length === 0 ? (
          <div className="p-4 text-sm text-text-tertiary text-center">Sin pagos próximos</div>
        ) : (
          upcoming.map((sub) => {
            const urgent = sub.daysLeft <= 3
            const urgentColor = urgent ? 'var(--urgency-warning)' : 'var(--text-tertiary)'
            const cycleLabel = CYCLE_LABELS[sub.cycle]
            return (
              <div key={sub.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold font-mono"
                  style={{ background: `color-mix(in srgb, ${urgentColor} 8%, transparent)`, color: urgentColor }}
                >
                  {sub.daysLeft === 0 ? 'HOY' : `${sub.daysLeft}d`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{sub.name}</p>
                  <p className="text-[10px] text-text-tertiary">
                    {sub.daysLeft === 0 ? 'Hoy' : sub.daysLeft === 1 ? 'Mañana' : `En ${sub.daysLeft} días`}
                    {cycleLabel && <span className="opacity-60"> · {cycleLabel}</span>}
                  </p>
                </div>
                <p className="text-[12px] font-mono font-semibold text-foreground flex-shrink-0">
                  {formatCurrency(sub.amount, 'EUR')}
                </p>
              </div>
            )
          })
        )}
      </div>
    </DashboardPanel>
  )
}
