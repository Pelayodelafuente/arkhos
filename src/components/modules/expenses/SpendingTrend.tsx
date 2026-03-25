"use client"

import { useMemo } from "react"
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, Tooltip } from "recharts"
import { Card } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { formatCurrency } from "@/lib/gastos-utils"
import { TrendingUp } from "lucide-react"
import type { SubscriptionWithCategory } from "@/types/expenses"

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload?: { name?: string; total?: number; label?: string } }>
}

function ProjectionTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.[0]?.payload) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg bg-card border border-border px-2.5 py-1.5 text-[11px]">
      <p className="text-text-secondary">{d.label ?? d.name}</p>
      <p className="font-mono font-medium text-foreground">
        {formatCurrency(d.total ?? 0)}
      </p>
    </div>
  )
}

function getProjectedTotal(subs: SubscriptionWithCategory[], month: number): number {
  return subs.reduce((acc, sub) => {
    if (sub.cycle === 'monthly') return acc + sub.amount
    if (sub.cycle === 'annual' && sub.started_at) {
      // Full amount in the billing month, 0 in other months
      const billingMonth = new Date(sub.started_at).getMonth() + 1
      return acc + (billingMonth === month ? sub.amount : 0)
    }
    if (sub.cycle === 'quarterly' && sub.started_at) {
      const startMonth = new Date(sub.started_at).getMonth() + 1
      const diff = ((month - startMonth) % 12 + 12) % 12
      return acc + (diff % 3 === 0 ? sub.amount : 0)
    }
    if (sub.cycle === 'semiannual' && sub.started_at) {
      const startMonth = new Date(sub.started_at).getMonth() + 1
      const diff = ((month - startMonth) % 12 + 12) % 12
      return acc + (diff % 6 === 0 ? sub.amount : 0)
    }
    return acc
  }, 0)
}

export function SpendingTrend() {
  const subscriptions = useExpensesStore((s) => s.subscriptions)

  const { data, hasData } = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active' || s.status === 'trial')
    if (active.length === 0) return { data: [], hasData: false }

    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        name: MONTH_NAMES[date.getMonth()],
        isCurrent: i === 0,
      }
    })

    const chartData = months.map(({ year, month, name, isCurrent }) => ({
      name,
      label: `${name} ${year}`,
      total: getProjectedTotal(active, month),
      isCurrent,
    }))

    return { data: chartData, hasData: true }
  }, [subscriptions])

  if (!hasData) {
    return (
      <Card padding="md">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <TrendingUp
            size={32}
            strokeWidth={0.75}
            className="text-text-tertiary/30 mb-2"
          />
          <p className="text-xs text-text-tertiary">
            Sin suscripciones activas
          </p>
        </div>
      </Card>
    )
  }

  const currentTotal = data[0]?.total ?? 0

  return (
    <Card padding="sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 pt-1 pb-2">
        <div className="h-3 w-0.5 rounded-full bg-[var(--module-gastos)]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-tertiary font-semibold">
          Proyección 12 meses
        </span>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: 90, minWidth: 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="15%">
            <XAxis
              dataKey="name"
              tick={{ fontSize: 8, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              dy={3}
            />
            <Tooltip content={<ProjectionTooltip />} />
            <Bar dataKey="total" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isCurrent ? '#5f1b29' : entry.total > currentTotal * 1.5 ? 'rgba(196,112,74,0.6)' : 'rgba(95,27,41,0.3)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Current month */}
      <div className="text-center pt-1 pb-1 px-2">
        <p className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(currentTotal)}
        </p>
        <p className="text-[10px] text-text-tertiary">este mes</p>
      </div>
    </Card>
  )
}
