'use client'

import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { formatCurrency } from '@/lib/utils/format'
import type { SubscriptionData } from './dashboard-view'

interface GastosPanelProps {
  subscriptions: SubscriptionData[]
}

const PRESUPUESTO_MENSUAL = 2200

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function isChargingThisMonth(sub: SubscriptionData): boolean {
  const now = new Date()
  if (sub.cycle === 'monthly') return true
  if (!sub.started_at) return false
  const start = new Date(sub.started_at)
  const monthsFromStart =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  if (monthsFromStart < 0) return false
  if (sub.cycle === 'annual') return start.getMonth() === now.getMonth()
  if (sub.cycle === 'quarterly') return monthsFromStart % 3 === 0
  if (sub.cycle === 'semiannual') return monthsFromStart % 6 === 0
  return false
}

function toAnnual(amount: number, cycle: string): number {
  const multiplier: Record<string, number> = {
    monthly: 12,
    annual: 1,
    quarterly: 4,
    semiannual: 2,
  }
  return amount * (multiplier[cycle] ?? 12)
}

function getBudgetColor(pct: number): string {
  if (pct < 75) return 'var(--module-patrimonio)'
  if (pct < 90) return 'var(--urgency-warning)'
  return 'var(--urgency-critical)'
}

export function GastosPanel({ subscriptions }: GastosPanelProps) {
  const now = new Date()
  const monthLabel = MONTHS_ES[now.getMonth()]

  const thisMonthTotal = subscriptions
    .filter(isChargingThisMonth)
    .reduce((s, sub) => s + sub.amount, 0)

  const budgetPct = Math.min((thisMonthTotal / PRESUPUESTO_MENSUAL) * 100, 100)
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
            <span className="text-xs text-text-tertiary capitalize">{monthLabel}</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {formatCurrency(thisMonthTotal, 'EUR').replace(',00', '')}
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
              Suscripciones más caras
            </p>
            {[...subscriptions]
              .sort((a, b) => toAnnual(b.amount, b.cycle) - toAnnual(a.amount, a.cycle))
              .slice(0, 5)
              .map((sub) => {
                const annual = toAnnual(sub.amount, sub.cycle)
                return (
                  <div key={sub.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground truncate flex-1">{sub.name}</span>
                    <span className="font-mono text-xs text-text-tertiary flex-shrink-0">
                      {formatCurrency(annual, 'EUR').replace(',00', '')}/año
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
