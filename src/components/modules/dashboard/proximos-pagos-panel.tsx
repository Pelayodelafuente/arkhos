import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { formatCurrency } from '@/lib/utils/format'
import type { SubscriptionData } from './dashboard-view'

interface SubWithBilling extends SubscriptionData {
  billing_day: number
  started_at: string | null
}

function daysUntilBillingDay(billingDay: number): number {
  const today = new Date()
  const day = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const effective = Math.min(billingDay, daysInMonth)
  if (effective >= day) return effective - day
  const nextMonthDays = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate()
  return daysInMonth - day + Math.min(billingDay, nextMonthDays)
}

function toMonthly(amount: number, cycle: string): number {
  const map: Record<string, number> = { monthly: 1, annual: 12, quarterly: 3, biannual: 6, weekly: 0.25 }
  return amount / (map[cycle] ?? 1)
}

interface ProximosPagosProps {
  subscriptions: SubscriptionData[]
}

export function ProximosPagosPanel({ subscriptions }: ProximosPagosProps) {
  const subs = subscriptions as SubWithBilling[]

  const upcoming = subs
    .filter((s) => typeof s.billing_day === 'number')
    .map((s) => ({ ...s, daysLeft: daysUntilBillingDay(s.billing_day) }))
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
            const monthly = toMonthly(sub.amount, sub.cycle)
            const urgent = sub.daysLeft <= 3
            const urgentColor = urgent ? 'var(--urgency-warning)' : 'var(--text-tertiary)'
            return (
              <div key={sub.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold font-mono"
                  style={{ background: `${urgentColor}15`, color: urgentColor }}
                >
                  {sub.daysLeft === 0 ? 'HOY' : sub.daysLeft <= 9 ? `${sub.daysLeft}d` : String(sub.billing_day)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{sub.name}</p>
                  <p className="text-[10px] text-text-tertiary">
                    {sub.daysLeft === 0 ? 'Hoy' : sub.daysLeft === 1 ? 'Mañana' : `En ${sub.daysLeft} días`}
                  </p>
                </div>
                <p className="text-[12px] font-mono font-semibold text-foreground flex-shrink-0">
                  {formatCurrency(monthly, 'EUR')}
                </p>
              </div>
            )
          })
        )}
      </div>
    </DashboardPanel>
  )
}
