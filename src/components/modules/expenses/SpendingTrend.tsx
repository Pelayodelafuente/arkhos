"use client"

import { useMemo } from "react"
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts"
import { Card } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { formatCurrency } from "@/lib/gastos-utils"
import { TrendingUp } from "lucide-react"

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

interface SpendingTrendTooltipProps {
  active?: boolean
  payload?: Array<{ payload?: { name?: string; total?: number } }>
}

function SpendingTrendTooltip({ active, payload }: SpendingTrendTooltipProps) {
  if (!active || !payload?.[0]?.payload) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg bg-card border border-border px-2.5 py-1.5 text-[11px]">
      <p className="text-text-secondary">{d.name}</p>
      <p className="font-mono font-medium text-foreground">
        {formatCurrency(d.total ?? 0)}
      </p>
    </div>
  )
}

export function SpendingTrend() {
  const monthlySpending = useExpensesStore((s) => s.monthlySpending)

  const { data, currentTotal, hasData } = useMemo(() => {
    const last6 = monthlySpending.slice(-6)
    const hasAnyData = last6.some((m) => m.total > 0)

    if (!hasAnyData) {
      return { data: [], currentTotal: 0, hasData: false }
    }

    const chartData = last6.map((m) => {
      const monthStr = m.month.split("-")[1]
      const monthIndex = parseInt(monthStr ?? "1", 10) - 1
      return {
        name: MONTH_NAMES[monthIndex] ?? "",
        total: m.total,
      }
    })

    const current = last6[last6.length - 1]?.total ?? 0
    return { data: chartData, currentTotal: current, hasData: true }
  }, [monthlySpending])

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
            Datos disponibles proximamente
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 pt-1 pb-2">
        <div className="h-3 w-0.5 rounded-full bg-[var(--module-gastos)]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-tertiary font-semibold">
          Tendencia
        </span>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4A7A9B" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#4A7A9B" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <Tooltip content={<SpendingTrendTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#4A7A9B"
              strokeWidth={2}
              fill="url(#trendFill)"
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Current total */}
      <div className="text-center pt-1 pb-1 px-2">
        <p className="font-mono text-sm font-semibold text-foreground">
          {formatCurrency(currentTotal)}
        </p>
        <p className="text-[10px] text-text-tertiary">este mes</p>
      </div>
    </Card>
  )
}
