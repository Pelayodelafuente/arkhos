'use client'

import { MarketTicker } from './market-ticker'
import { DashboardHeader } from './dashboard-header'
import { KPIStrip } from './kpi-strip'
import { PatrimonioPanel } from './patrimonio-panel'
import { GastosPanel } from './gastos-panel'
import { AlertasPanel } from './alertas-panel'
import { ProyectosPanel } from './proyectos-panel'
import { MercadosPanel } from './mercados-panel'
import { ActivityFeed } from './activity-feed'
import { NotaRapidaPanel } from './nota-rapida-panel'
import { NotasRecientesPanel } from './notas-recientes-panel'
import { EvolucionPlataformasPanel } from './evolucion-plataformas-panel'
import { ProximosPagosPanel } from './proximos-pagos-panel'
import { HoyPanel } from './hoy-panel'
import { useDashboardStore } from '@/stores/dashboard-store'

export interface SnapshotData {
  snapshot_date: string
  total_value: number
  invested_value: number
}

export interface ProjectPhaseTask {
  id: string
  done: boolean
}

export interface ProjectPhase {
  id: string
  phase_tasks: ProjectPhaseTask[] | null
}

export interface ProjectData {
  id: string
  name: string
  icon: string | null
  status: string
  updated_at: string
  project_phases: ProjectPhase[] | null
}

export interface SubscriptionData {
  id: string
  name: string
  amount: number
  cycle: string
  status: string
  category_id: string | null
  billing_day?: number
  started_at?: string | null
}

export interface PlatformData {
  id: string
  name: string
  slug: string
  current_value: number
  total_invested: number
  cash_value: number
}

export interface ActivityData {
  id: string
  module: string
  action: string
  entity_name: string | null
  detail: string | null
  created_at: string
}

export interface NoteData {
  id: string
  title: string
  content: string
  created_at: string
  color: string | null
}

export interface MarketData {
  btcChange24h: number | null
  ethPrice: number | null
  ethChange24h: number | null
  fearGreed: { value: number; label: string } | null
  eurUsd: number | null
  vix: number | null
  us10y: number | null
  dxy: number | null
  gold: number | null
  iglnPrice: number | null
  iglnChangePct: number | null
  cspxPrice: number | null
  cspxChangePct: number | null
}

export interface DashboardViewProps {
  userName: string
  userId: string
}

export function DashboardView({ userName, userId }: DashboardViewProps) {
  const data = useDashboardStore((s) => s.data)
  const error = useDashboardStore((s) => s.error)

  if (!data) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-text-tertiary">
          {error ?? 'Cargando dashboard…'}
        </p>
      </div>
    )
  }

  const {
    initialActivity,
    initialProjects,
    initialSnapshots,
    initialSubscriptions,
    initialPlatforms,
    initialNotes,
    btcPrice,
    btcBalance,
    marketData,
  } = data

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <MarketTicker />
      <DashboardHeader userName={userName} />
      <KPIStrip
        projects={initialProjects}
        snapshots={initialSnapshots}
        subscriptions={initialSubscriptions}
        platforms={initialPlatforms}
        btcPrice={btcPrice}
        btcBalance={btcBalance}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 space-y-3 pb-20 lg:pb-28">
          <HoyPanel userId={userId} />
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_1.4fr_1.6fr] gap-3">
            <PatrimonioPanel snapshots={initialSnapshots} platforms={initialPlatforms} />
            <GastosPanel subscriptions={initialSubscriptions} />
            <AlertasPanel
              projects={initialProjects}
              subscriptions={initialSubscriptions}
              snapshots={initialSnapshots}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-3">
            <ProyectosPanel projects={initialProjects} />
            <MercadosPanel btcPrice={btcPrice} marketData={marketData} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <ActivityFeed activity={initialActivity} />
            <NotaRapidaPanel />
            <NotasRecientesPanel notes={initialNotes} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <EvolucionPlataformasPanel platforms={initialPlatforms} />
            <ProximosPagosPanel subscriptions={initialSubscriptions} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

interface DashboardPanelProps {
  children: React.ReactNode
  className?: string
}

export function DashboardPanel({ children, className = '' }: DashboardPanelProps) {
  return (
    <div
      className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

interface PanelHeaderProps {
  color: string
  title: string
  chip?: React.ReactNode
  right?: React.ReactNode
}

export function PanelHeader({ color, title, chip, right }: PanelHeaderProps) {
  return (
    <div className="relative">
      <div className="h-[2px] w-full" style={{ backgroundColor: color }} />
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {chip}
        </div>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </div>
  )
}

export function PanelDivider() {
  return <div className="h-px bg-border mx-4" />
}

interface ModuleChipProps {
  label: string
  color: string
}

export function ModuleChip({ label, color }: ModuleChipProps) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
      style={{ color, backgroundColor: `${color}18` }}
    >
      {label}
    </span>
  )
}

export function LiveDot({ color = '#22C55E' }: { color?: string }) {
  return (
    <span
      className="live-dot inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  )
}
