"use client"

import { useMemo, useState } from "react"
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts"
import { Card } from "@/components/ui"
import { useExpensesStore } from "@/stores/expenses-store"
import { formatCurrency } from "@/lib/gastos-utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
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
  const monthlySpending = useExpensesStore((s) => s.monthlySpending)
  const [activeTab, setActiveTab] = useState<'projection' | 'history'>('projection')

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

  // Build historical data from monthlySpending (last 6 months)
  const historyData = useMemo(() => {
    if (!monthlySpending || monthlySpending.length === 0) return []
    const sorted = [...monthlySpending].sort((a, b) => a.month.localeCompare(b.month))
    return sorted.map((entry, i) => {
      const [year, month] = entry.month.split('-').map(Number)
      const label = `${MONTH_NAMES[(month ?? 1) - 1]} ${year}`
      const prev = i > 0 ? sorted[i - 1]?.total ?? 0 : null
      const diff = prev !== null ? entry.total - prev : 0
      return { label, total: entry.total, diff, month: entry.month }
    })
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
            Sin suscripciones activas
          </p>
        </div>
      </Card>
    )
  }

  const currentTotal = data[0]?.total ?? 0

  return (
    <Card padding="sm">
      {/* Header + tab toggle */}
      <div className="flex items-center gap-2 px-2 pt-1 pb-2">
        <div className="h-3 w-0.5 rounded-full bg-[var(--module-gastos)]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-tertiary font-semibold">
          {activeTab === 'projection' ? 'Proyección 12 meses' : 'Historial mensual'}
        </span>
        <div className="ml-auto flex items-center gap-0.5 rounded-md bg-sand p-0.5">
          <button
            onClick={() => setActiveTab('projection')}
            className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors cursor-pointer ${activeTab === 'projection' ? 'bg-card text-foreground shadow-sm' : 'text-text-tertiary'}`}
          >
            Proyección
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors cursor-pointer ${activeTab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-text-tertiary'}`}
          >
            Historial
          </button>
        </div>
      </div>

      {activeTab === 'projection' ? (
        <>
          {/* Projection Bar Chart */}
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
                <Tooltip content={<ProjectionTooltip />} cursor={{ fill: 'var(--bg-card-hover)' }} />
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
        </>
      ) : (
        <>
          {/* History line chart */}
          {historyData.length >= 2 ? (
            <div style={{ width: "100%", height: 90, minWidth: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 8, fill: "var(--text-tertiary)" }}
                    axisLine={false}
                    tickLine={false}
                    dy={3}
                    tickFormatter={(v: string) => v.split(' ')[0] ?? v}
                  />
                  <Tooltip content={<ProjectionTooltip />} cursor={{ stroke: 'var(--border-stone)', strokeWidth: 1 }} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#5f1b29"
                    strokeWidth={2}
                    dot={{ fill: '#5f1b29', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: '#5f1b29' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-[11px] text-text-tertiary">Sin suficientes datos históricos</p>
            </div>
          )}
          {/* Month-over-month table */}
          {historyData.length > 0 && (
            <div className="px-2 pb-1 space-y-0.5 mt-1">
              {historyData.slice(-4).map((entry) => {
                const isUp = entry.diff > 0
                const isDown = entry.diff < 0
                const DiffIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
                return (
                  <div key={entry.month} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-tertiary w-14 flex-shrink-0">{entry.label.split(' ')[0]}</span>
                    <span className="font-mono text-[10px] text-foreground tabular-nums">{formatCurrency(entry.total)}</span>
                    {entry.diff !== 0 && (
                      <span className={`flex items-center gap-0.5 font-mono text-[9px] ml-auto ${isUp ? 'text-red-500' : 'text-emerald-600'}`}>
                        <DiffIcon size={9} strokeWidth={2} />
                        {Math.abs(entry.diff).toFixed(0)}€
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
