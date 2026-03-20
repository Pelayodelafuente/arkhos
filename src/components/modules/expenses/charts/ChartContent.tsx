"use client"

import { useState, useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { useExpensesStore } from "@/stores/expenses-store"
import { formatCurrency, groupByCategory, getMonthlyEquivalent } from "@/lib/gastos-utils"
import { ServiceAvatar } from "../ServiceAvatar"

type Tab = 'distribution' | 'evolution' | 'heatmap'

export default function ChartContent() {
  const [activeTab, setActiveTab] = useState<Tab>('distribution')
  const subscriptions = useExpensesStore((s) => s.subscriptions)

  const active = useMemo(
    () => subscriptions.filter((s) => s.status === 'active'),
    [subscriptions]
  )

  const tabs: { value: Tab; label: string }[] = [
    { value: 'distribution', label: 'Distribución' },
    { value: 'evolution', label: 'Evolución' },
    { value: 'heatmap', label: 'Calendario' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-lg bg-sand p-0.5 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'distribution' && <DistributionChart subscriptions={active} />}
      {activeTab === 'evolution' && <EvolutionChart subscriptions={active} />}
      {activeTab === 'heatmap' && <YearHeatmap subscriptions={active} />}
    </div>
  )
}

// ─── Distribution (Donut) ───────────

import type { SubscriptionWithCategory } from "@/types/expenses"

function DistributionChart({ subscriptions }: { subscriptions: SubscriptionWithCategory[] }) {
  const groups = useMemo(() => groupByCategory(subscriptions), [subscriptions])

  const chartData = groups.map((g) => ({
    name: g.category?.name ?? 'Sin categoría',
    value: g.totalMonthly + g.totalAnnual / 12,
    color: g.category?.color ?? '#888780',
  }))

  const total = chartData.reduce((acc, d) => acc + d.value, 0)

  if (chartData.length === 0) {
    return <p className="text-center text-sm text-text-tertiary py-8">No hay suscripciones activas</p>
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="relative mx-auto h-[220px] w-[220px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[10px] text-text-tertiary">TOTAL/MES</span>
          <span className="font-heading text-lg text-foreground">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="flex-1 max-h-[260px] overflow-y-auto space-y-1.5">
        {chartData.map((entry) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0'
          return (
            <div key={entry.name} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
              <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="flex-1 text-[13px] text-foreground truncate">{entry.name}</span>
              <div className="text-right flex-shrink-0">
                <span className="font-mono text-[13px] text-foreground">{formatCurrency(entry.value)}</span>
                <span className="ml-1 font-mono text-[10px] text-text-tertiary">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Evolution (Bar) ────────────────

function EvolutionChart({ subscriptions }: { subscriptions: SubscriptionWithCategory[] }) {
  const total = subscriptions.reduce((acc, s) => acc + getMonthlyEquivalent(s), 0)

  const now = new Date()
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  // Since we don't have historical data, show current month highlighted
  const data = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = (now.getMonth() - 5 + i + 12) % 12
    return {
      name: monthNames[monthIndex],
      total: i === 5 ? total : 0,
      isCurrent: i === 5,
    }
  })

  return (
    <div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={50} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-stone)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [formatCurrency(Number(value)), 'Total']}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? '#4A7A9B' : 'rgba(74,122,155,0.2)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-text-tertiary mt-3">
        Los datos históricos se irán acumulando mes a mes
      </p>
    </div>
  )
}

// ─── Year Heatmap ───────────────────

function YearHeatmap({ subscriptions }: { subscriptions: SubscriptionWithCategory[] }) {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  // Build a 12×31 grid of spending
  const grid = useMemo(() => {
    const result: { month: number; day: number; amount: number }[][] = []
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(new Date().getFullYear(), m + 1, 0).getDate()
      const monthData: { month: number; day: number; amount: number }[] = []
      for (let d = 1; d <= 31; d++) {
        if (d > daysInMonth) {
          monthData.push({ month: m, day: d, amount: -1 }) // invalid
          continue
        }
        const dayTotal = subscriptions
          .filter((s) => {
            const effective = s.billing_day > daysInMonth ? daysInMonth : s.billing_day
            return effective === d
          })
          .reduce((acc, s) => acc + (s.cycle === 'monthly' ? s.amount : s.amount / 12), 0)
        monthData.push({ month: m, day: d, amount: dayTotal })
      }
      result.push(monthData)
    }
    return result
  }, [subscriptions])

  const getColor = (amount: number): string => {
    if (amount < 0) return 'transparent'
    if (amount === 0) return 'rgba(74,122,155,0.05)'
    if (amount <= 20) return 'rgba(74,122,155,0.15)'
    if (amount <= 50) return 'rgba(74,122,155,0.30)'
    return 'rgba(74,122,155,0.50)'
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Month labels */}
        <div className="flex gap-0.5 mb-1 ml-8">
          {monthNames.map((m) => (
            <div key={m} className="flex-1 text-center text-[9px] font-mono text-text-tertiary">
              {m}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 31 }, (_, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-0.5">
              <span className="w-7 text-right text-[9px] font-mono text-text-tertiary flex-shrink-0">
                {dayIdx + 1}
              </span>
              <div className="flex gap-0.5 flex-1">
                {grid.map((monthData, mIdx) => {
                  const cell = monthData[dayIdx]
                  if (!cell || cell.amount < 0) {
                    return <div key={mIdx} className="flex-1 h-3 rounded-sm" />
                  }
                  return (
                    <div
                      key={mIdx}
                      className="flex-1 h-3 rounded-sm transition-colors"
                      style={{ backgroundColor: getColor(cell.amount) }}
                      title={cell.amount > 0 ? `${monthNames[mIdx]} ${dayIdx + 1}: ${formatCurrency(cell.amount)}` : undefined}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
