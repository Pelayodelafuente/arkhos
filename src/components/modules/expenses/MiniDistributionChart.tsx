"use client"

import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { groupByCategory, formatCurrency } from "@/lib/gastos-utils"
import { BarChart3 } from "lucide-react"

export function MiniDistributionChart() {
  const subscriptions = useExpensesStore((s) => s.subscriptions)

  const active = useMemo(
    () => subscriptions.filter((s) => s.status === "active"),
    [subscriptions]
  )

  const { chartData, total } = useMemo(() => {
    const groups = groupByCategory(active)
    const allData = groups.map((g) => ({
      name: g.category?.name ?? "Sin categoria",
      value:
        g.totalMonthly +
        g.totalQuarterly / 3 +
        g.totalSemiannual / 6 +
        g.totalAnnual / 12,
      color: g.category?.color ?? "#888780",
    }))

    // Keep top 5, merge rest into "Otros"
    const sorted = [...allData].sort((a, b) => b.value - a.value)
    const top5 = sorted.slice(0, 5)
    const rest = sorted.slice(5)
    const restTotal = rest.reduce((acc, d) => acc + d.value, 0)

    const data =
      restTotal > 0
        ? [...top5, { name: "Otros", value: restTotal, color: "#888780" }]
        : top5

    const t = data.reduce((acc, d) => acc + d.value, 0)
    return { chartData: data, total: t }
  }, [active])

  if (chartData.length === 0) {
    return (
      <Card padding="md">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <BarChart3
            size={32}
            strokeWidth={0.75}
            className="text-text-tertiary/30 mb-2"
          />
          <p className="text-xs text-text-tertiary">
            Sin datos de distribucion
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="sm">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 px-2 pt-1 pb-0">
          <div className="h-3 w-0.5 rounded-full bg-[var(--module-gastos)]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-tertiary font-semibold">
            Distribucion
          </span>
        </div>

        {/* Chart */}
        <div className="mx-auto" style={{ width: 150, height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-1 px-2 pb-1">
          {chartData.map((entry) => {
            const pct =
              total > 0 ? ((entry.value / total) * 100).toFixed(0) : "0"
            return (
              <div
                key={entry.name}
                className="flex items-center gap-2"
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="flex-1 text-[11px] text-text-secondary truncate text-left">
                  {entry.name}
                </span>
                <span className="font-mono text-[10px] text-text-tertiary flex-shrink-0">
                  {pct}%
                </span>
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div className="border-t border-border mt-1 pt-2 px-2 pb-1">
          <p className="font-mono text-xs text-foreground text-center">
            {formatCurrency(total)}
            <span className="text-text-tertiary text-[10px] ml-1">/mes</span>
          </p>
        </div>
      </div>
    </Card>
  )
}
