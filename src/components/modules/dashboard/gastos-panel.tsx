'use client'

import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { formatCurrency } from '@/lib/utils/format'
import type { SubscriptionData } from './dashboard-view'

interface GastosPanelProps {
  subscriptions: SubscriptionData[]
}

const PRESUPUESTO_MENSUAL = 2200

function toMonthly(amount: number, cycle: string): number {
  const map: Record<string, number> = {
    monthly: 1,
    annual: 12,
    quarterly: 3,
    biannual: 6,
    weekly: 0.25,
  }
  return amount / (map[cycle] ?? 1)
}

function getBudgetColor(pct: number): string {
  if (pct < 75) return 'var(--module-patrimonio)'
  if (pct < 90) return 'var(--urgency-warning)'
  return 'var(--urgency-critical)'
}

export function GastosPanel({ subscriptions }: GastosPanelProps) {
  const totalMonthly = subscriptions.reduce((s, sub) => s + toMonthly(sub.amount, sub.cycle), 0)
  const budgetPct = Math.min((totalMonthly / PRESUPUESTO_MENSUAL) * 100, 100)
  const barColor = getBudgetColor(budgetPct)

  return (
    <DashboardPanel>
      <PanelHeader
        color="var(--module-gastos)"
        title="Gastos"
        chip={<ModuleChip label="GAS" color="var(--module-gastos)" />}
      />
      <div className="px-4 pb-4 space-y-4">
        <div>
          <div className="flex items-end justify-between mb-1">
            <span className="text-xs text-text-tertiary">Total mensual</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {formatCurrency(totalMonthly, 'EUR').replace(',00', '')}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-sand">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${budgetPct}%`, backgroundColor: barColor }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-text-muted">
              {budgetPct.toFixed(0)}% del presupuesto
            </span>
            <span className="text-[10px] text-text-muted">
              {formatCurrency(PRESUPUESTO_MENSUAL, 'EUR').replace(',00', '')}
            </span>
          </div>
        </div>
        {subscriptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Top suscripciones
            </p>
            {subscriptions.slice(0, 5).map((sub) => {
              const monthly = toMonthly(sub.amount, sub.cycle)
              return (
                <div key={sub.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground truncate flex-1">{sub.name}</span>
                  <span className="font-mono text-xs text-text-tertiary flex-shrink-0">
                    {formatCurrency(monthly, 'EUR').replace(',00', '')}/mes
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {subscriptions.length === 0 && (
          <p className="text-xs text-text-muted text-center py-2">Sin suscripciones activas</p>
        )}
      </div>
    </DashboardPanel>
  )
}
