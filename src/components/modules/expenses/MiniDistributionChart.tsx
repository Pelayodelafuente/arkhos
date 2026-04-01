"use client"

import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { groupByCategory, formatCurrency } from "@/lib/gastos-utils"
import { BarChart3, X } from "lucide-react"

function makePieTooltip(total: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function PieTooltip({ active, payload }: any) {
    if (!active || !payload?.[0]) return null
    const name = payload[0].name as string | undefined
    const value = payload[0].value as number | undefined
    const pct = total > 0 && value ? ((value / total) * 100).toFixed(0) : '0'
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <p className="text-xs text-text-secondary mb-0.5">{name}</p>
        <p className="font-mono text-sm font-semibold text-foreground">{formatCurrency(value ?? 0)}</p>
        <p className="font-mono text-[10px] text-text-tertiary">{pct}% del total</p>
      </div>
    )
  }
}

export function MiniDistributionChart() {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const categoryFilter = useExpensesStore((s) => s.categoryFilter)
  const setCategoryFilter = useExpensesStore((s) => s.setCategoryFilter)

  const active = useMemo(
    () => subscriptions.filter((s) => s.status === "active"),
    [subscriptions]
  )

  const { chartData, total } = useMemo(() => {
    const groups = groupByCategory(active)
    const allData = groups.map((g) => ({
      id: g.category?.id ?? null,
      name: g.category?.name ?? "Sin categoría",
      value:
        g.totalMonthly +
        g.totalQuarterly / 3 +
        g.totalSemiannual / 6 +
        g.totalAnnual / 12,
      color: g.category?.color ?? "#9a7a5a",
    }))

    // Keep top 5, merge rest into "Otros"
    const sorted = [...allData].sort((a, b) => b.value - a.value)
    const top5 = sorted.slice(0, 5)
    const rest = sorted.slice(5)
    const restTotal = rest.reduce((acc, d) => acc + d.value, 0)

    const data: typeof allData =
      restTotal > 0
        ? [...top5, { id: null, name: "Otros", value: restTotal, color: "#9a7a5a" }]
        : top5

    const t = data.reduce((acc, d) => acc + d.value, 0)
    return { chartData: data, total: t }
  }, [active])

  const activeCategoryName = useMemo(() => {
    if (!categoryFilter) return null
    return chartData.find((d) => d.id === categoryFilter)?.name ?? null
  }, [categoryFilter, chartData])

  const handleCellClick = (entry: { id: string | null }) => {
    if (entry.id === null) return // "Otros" not filterable
    setCategoryFilter(categoryFilter === entry.id ? null : entry.id)
  }

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
            Sin datos de distribución
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
            Distribución
          </span>
          {activeCategoryName && (
            <button
              onClick={() => setCategoryFilter(null)}
              className="ml-auto flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[9px] font-medium text-text-secondary hover:bg-border transition-colors cursor-pointer"
            >
              {activeCategoryName}
              <X size={9} strokeWidth={2} />
            </button>
          )}
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
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={categoryFilter && categoryFilter !== entry.id ? 0.35 : 1}
                    style={{ cursor: entry.id ? 'pointer' : 'default', outline: 'none' }}
                    onClick={() => handleCellClick(entry)}
                  />
                ))}
              </Pie>
              <Tooltip content={makePieTooltip(total)} />
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
