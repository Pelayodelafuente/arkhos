"use client"

import { useState, useMemo, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { useExpensesStore } from "@/stores/expenses-store"
import { formatCurrency, groupByCategory, getMonthlyEquivalent } from "@/lib/gastos-utils"
import { getSubscriptionsForDay } from "@/utils/expenses-calendar"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

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

// ─── Animated Counter ──────────────

function AnimatedCounter({ value, format }: { value: number; format: (n: number) => string }) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 80, damping: 25 })
  const display = useTransform(spring, (v) => format(v))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return <motion.span>{display}</motion.span>
}

// ─── Distribution (Donut) ───────────

import type { SubscriptionWithCategory } from "@/types/expenses"

function DistributionChart({ subscriptions }: { subscriptions: SubscriptionWithCategory[] }) {
  const groups = useMemo(() => groupByCategory(subscriptions), [subscriptions])

  const chartData = groups.map((g) => ({
    name: g.category?.name ?? 'Sin categoría',
    value: g.totalMonthly + g.totalQuarterly / 3 + g.totalSemiannual / 6 + g.totalAnnual / 12,
    color: g.category?.color ?? '#9a7a5a',
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[10px] text-text-tertiary">TOTAL/MES</span>
          <span className="font-heading text-lg text-foreground">
            <AnimatedCounter value={total} format={formatCurrency} />
          </span>
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
                <span className="font-mono text-[13px] text-foreground"><AnimatedCounter value={entry.value} format={formatCurrency} /></span>
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
  const monthlySpending = useExpensesStore((s) => s.monthlySpending)

  const now = new Date()
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const hasData = monthlySpending.some((m) => m.total > 0)

  const data = useMemo(() => {
    if (!hasData) {
      // Fallback: show current estimate
      const total = subscriptions.reduce((acc, s) => acc + getMonthlyEquivalent(s), 0)
      return Array.from({ length: 6 }, (_, i) => {
        const monthIndex = (now.getMonth() - 5 + i + 12) % 12
        return {
          name: monthNames[monthIndex],
          total: i === 5 ? total : 0,
          count: i === 5 ? subscriptions.length : 0,
          isCurrent: i === 5,
          prevTotal: 0,
        }
      })
    }

    return monthlySpending.map((m, i) => {
      const [yearStr, monthStr] = m.month.split('-')
      const monthIndex = parseInt(monthStr, 10) - 1
      const prevMonth = i > 0 ? monthlySpending[i - 1].total : 0
      return {
        name: monthNames[monthIndex],
        total: m.total,
        count: m.count,
        isCurrent: m.month === currentMonthKey,
        prevTotal: prevMonth,
        fullMonth: `${monthNames[monthIndex]} ${yearStr}`,
      }
    })
  }, [monthlySpending, hasData, subscriptions, now, currentMonthKey])

  interface TooltipPayload {
    payload?: {
      fullMonth?: string
      name?: string
      total?: number
      count?: number
    }
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (!active || !payload || !payload[0]) return null
    const d = payload[0].payload
    if (!d) return null
    return (
      <div className="rounded-lg bg-card border border-border px-3 py-2 text-xs">
        <p className="font-medium text-foreground">{d.fullMonth ?? d.name}</p>
        <p className="font-mono text-foreground">{formatCurrency(d.total ?? 0)}</p>
        <p className="text-text-tertiary">{d.count ?? 0} pago{(d.count ?? 0) !== 1 ? 's' : ''}</p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-text-tertiary">
          Los datos de evolucion se generan automaticamente cada mes
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={50} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? '#5f1b29' : 'rgba(95,27,41,0.35)'} />
              ))}
            </Bar>
            <Bar dataKey="prevTotal" radius={[6, 6, 0, 0]} fillOpacity={0}>
              {data.map((_, i) => (
                <Cell key={i} fill="transparent" stroke="#5f1b29" strokeWidth={1} strokeDasharray="4 4" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-text-tertiary mt-3">
        Gasto real basado en pagos registrados
      </p>
    </div>
  )
}

// ─── Year Heatmap ───────────────────

function YearHeatmap({ subscriptions }: { subscriptions: SubscriptionWithCategory[] }) {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)

  const currentYear = new Date().getFullYear()

  // Build a 12×31 grid of spending using getSubscriptionsForDay
  const grid = useMemo(() => {
    const result: { month: number; day: number; amount: number; subs: SubscriptionWithCategory[] }[][] = []
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(currentYear, m + 1, 0).getDate()
      const monthData: { month: number; day: number; amount: number; subs: SubscriptionWithCategory[] }[] = []
      for (let d = 1; d <= 31; d++) {
        if (d > daysInMonth) {
          monthData.push({ month: m, day: d, amount: -1, subs: [] })
          continue
        }
        // Use getSubscriptionsForDay for proper cycle handling
        const daySubs = getSubscriptionsForDay(subscriptions, d, currentYear, m + 1)
        const dayTotal = daySubs.reduce((acc, s) => acc + getMonthlyEquivalent(s), 0)
        monthData.push({ month: m, day: d, amount: dayTotal, subs: daySubs })
      }
      result.push(monthData)
    }
    return result
  }, [subscriptions, currentYear])

  const getColor = (amount: number): string => {
    if (amount < 0) return 'transparent'
    if (amount === 0) return 'rgba(74,122,155,0.05)'
    if (amount <= 20) return 'rgba(74,122,155,0.15)'
    if (amount <= 50) return 'rgba(74,122,155,0.30)'
    return 'rgba(74,122,155,0.50)'
  }

  return (
    <div className="overflow-x-auto relative">
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
                      className="flex-1 h-3 rounded-sm transition-colors cursor-default"
                      style={{ backgroundColor: getColor(cell.amount) }}
                      onMouseEnter={(e) => {
                        if (cell.subs.length > 0) {
                          const lines = cell.subs.map((s) => `${s.name}: ${formatCurrency(s.amount)}`).join('\n')
                          setTooltip({
                            x: e.clientX,
                            y: e.clientY,
                            content: `${monthNames[mIdx]} ${dayIdx + 1}\n${lines}`,
                          })
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg bg-foreground text-card px-3 py-2 text-[11px] shadow-lg whitespace-pre-line"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  )
}
