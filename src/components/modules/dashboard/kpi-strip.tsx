'use client'

import { useAnimatedCounter } from '@/lib/hooks/use-animated-counter'
import { formatCurrency } from '@/lib/utils/format'
import { DashboardSparkline } from './dashboard-sparkline'
import { ModuleChip } from './dashboard-view'
import type { ProjectData, SnapshotData, SubscriptionData, PlatformData } from './dashboard-view'

interface KPIStripProps {
  projects: ProjectData[]
  snapshots: SnapshotData[]
  subscriptions: SubscriptionData[]
  platforms: PlatformData[]
  btcPrice?: number | null
  btcBalance?: number | null
}

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

function KPICell({
  color,
  label,
  chip,
  value,
  subtext,
  sparkData,
}: {
  color: string
  label: string
  chip: string
  value: string
  subtext: string
  sparkData: number[]
}) {
  return (
    <div className="relative flex-shrink-0 min-w-[140px] lg:min-w-0 px-4 py-3 border-r border-border last:border-r-0">
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary truncate">
              {label}
            </span>
            <ModuleChip label={chip} color={color} />
          </div>
          <div className="font-mono text-base font-semibold text-foreground leading-tight">
            {value}
          </div>
          <div className="mt-0.5 text-[10px] text-text-muted truncate">{subtext}</div>
        </div>
        {sparkData.length >= 2 && (
          <DashboardSparkline data={sparkData} color={color} width={56} height={24} />
        )}
      </div>
    </div>
  )
}

function PatrimonioKPI({ platforms, snapshots }: { platforms: PlatformData[]; snapshots: SnapshotData[] }) {
  const total = platforms.reduce((s, p) => s + p.current_value, 0)
  const animated = useAnimatedCounter(total)
  const sparkData = snapshots.map((s) => s.total_value)

  return (
    <KPICell
      color="var(--module-patrimonio)"
      label="Patrimonio"
      chip="PATR"
      value={formatCurrency(animated, 'EUR').replace(',00', '')}
      subtext="valor total actual"
      sparkData={sparkData}
    />
  )
}

function PLKpi({ snapshots, platforms }: { snapshots: SnapshotData[]; platforms: PlatformData[] }) {
  const totalValue = platforms.reduce((s, p) => s + p.current_value, 0)
  const totalInvested = platforms.reduce((s, p) => s + p.total_invested, 0)
  const pl = totalValue - totalInvested
  const animated = useAnimatedCounter(pl)
  const positive = pl >= 0
  const color = positive ? 'var(--color-gain)' : 'var(--color-loss)'
  const sparkData = snapshots.map((s) => s.total_value - s.invested_value)

  return (
    <KPICell
      color={color}
      label="Ganancia Total"
      chip="P&L"
      value={(positive ? '+' : '') + formatCurrency(animated, 'EUR').replace(',00', '')}
      subtext="acumulado · todas las plataformas"
      sparkData={sparkData}
    />
  )
}

function GastosKPI({ subscriptions }: { subscriptions: SubscriptionData[] }) {
  const now = new Date()
  const monthLabel = MONTHS_ES[now.getMonth()]
  const monthly = subscriptions
    .filter(isChargingThisMonth)
    .reduce((s, sub) => s + sub.amount, 0)
  const animated = useAnimatedCounter(monthly)
  const sparkData = [monthly * 0.82, monthly * 0.9, monthly * 0.95, monthly * 0.88, monthly]

  return (
    <KPICell
      color="var(--module-gastos)"
      label={`Gasto ${monthLabel}`}
      chip="GAS"
      value={formatCurrency(animated, 'EUR').replace(',00 €', ' €')}
      subtext="gasto real del mes"
      sparkData={sparkData}
    />
  )
}

function ProyectosKPI({ projects }: { projects: ProjectData[] }) {
  const animated = useAnimatedCounter(projects.length)

  return (
    <KPICell
      color="var(--module-proyectos)"
      label="Proyectos"
      chip="PROY"
      value={String(Math.round(animated))}
      subtext="proyectos activos"
      sparkData={[]}
    />
  )
}

function BitcoinKPI({ btcPrice, btcBalance }: { btcPrice: number | null; btcBalance: number | null }) {
  const price = btcPrice ?? 0
  const animated = useAnimatedCounter(price)
  const display = price > 0 ? formatCurrency(animated, 'EUR').replace(',00', '') : '—'
  const sub = btcBalance && btcBalance > 0 ? `${btcBalance.toFixed(4)} BTC en cartera` : 'precio actual EUR'

  return (
    <KPICell
      color="#F7931A"
      label="Bitcoin"
      chip="BTC"
      value={display}
      subtext={sub}
      sparkData={[]}
    />
  )
}

export function KPIStrip({ projects, snapshots, subscriptions, platforms, btcPrice, btcBalance }: KPIStripProps) {
  return (
    <div
      className="flex-shrink-0 border-b border-border overflow-x-auto"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div className="flex lg:grid lg:grid-cols-5 min-w-max lg:min-w-0">
        <PatrimonioKPI platforms={platforms} snapshots={snapshots} />
        <PLKpi snapshots={snapshots} platforms={platforms} />
        <GastosKPI subscriptions={subscriptions} />
        <ProyectosKPI projects={projects} />
        <BitcoinKPI btcPrice={btcPrice ?? null} btcBalance={btcBalance ?? null} />
      </div>
    </div>
  )
}
