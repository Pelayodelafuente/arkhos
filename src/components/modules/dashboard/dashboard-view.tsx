'use client'

import { useEffect, useState } from 'react'
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
import { DashboardCustomize } from './dashboard-customize'
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

// ─── Bento layout: registro de widgets ────────────────────────────────────────

type WidgetKey =
  | 'hoy'
  | 'patrimonio'
  | 'gastos'
  | 'alertas'
  | 'proyectos'
  | 'mercados'
  | 'actividad'
  | 'notaRapida'
  | 'notasRecientes'
  | 'evolucion'
  | 'proximosPagos'

// span sobre una grid de 12 columnas (solo ≥lg; en móvil todo es 1 columna).
// Clases estáticas para que Tailwind las genere.
const SPAN_CLASS: Record<number, string> = {
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  8: 'lg:col-span-8',
  12: 'lg:col-span-12',
}

const WIDGET_META: Record<WidgetKey, { label: string; span: 3 | 4 | 6 | 8 | 12 }> = {
  hoy: { label: 'Hoy (agenda del día)', span: 12 },
  patrimonio: { label: 'Patrimonio', span: 6 },
  gastos: { label: 'Gastos', span: 3 },
  alertas: { label: 'Alertas', span: 3 },
  proyectos: { label: 'Proyectos', span: 4 },
  mercados: { label: 'Mercados', span: 8 },
  actividad: { label: 'Actividad reciente', span: 4 },
  notaRapida: { label: 'Nota rápida', span: 4 },
  notasRecientes: { label: 'Notas recientes', span: 4 },
  evolucion: { label: 'Evolución por plataforma', span: 6 },
  proximosPagos: { label: 'Próximos pagos', span: 6 },
}

const DEFAULT_ORDER: WidgetKey[] = [
  'hoy',
  'patrimonio',
  'gastos',
  'alertas',
  'proyectos',
  'mercados',
  'actividad',
  'notaRapida',
  'notasRecientes',
  'evolucion',
  'proximosPagos',
]

const LAYOUT_STORAGE_KEY = 'arkhos-dashboard-widgets'

interface WidgetLayout {
  order: WidgetKey[]
  hidden: WidgetKey[]
}

const isWidgetKey = (k: string): k is WidgetKey => k in WIDGET_META

/** Sanea un layout guardado: quita keys desconocidas y añade widgets nuevos al final. */
function normalizeLayout(raw: unknown): WidgetLayout {
  const parsed = (raw ?? {}) as Partial<{ order: string[]; hidden: string[] }>
  const order = (parsed.order ?? []).filter(isWidgetKey)
  for (const key of DEFAULT_ORDER) if (!order.includes(key)) order.push(key)
  const hidden = (parsed.hidden ?? []).filter(isWidgetKey)
  return { order, hidden }
}

export function DashboardView({ userName, userId }: DashboardViewProps) {
  const data = useDashboardStore((s) => s.data)
  const error = useDashboardStore((s) => s.error)

  // Layout por defecto estable para SSR/primer render; la preferencia guardada
  // se aplica tras montar (mismo patrón que el resto de prefs en localStorage).
  const [layout, setLayout] = useState<WidgetLayout>({ order: DEFAULT_ORDER, hidden: [] })

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
      // setState post-montaje intencionado: aplica la preferencia guardada sin
      // afectar a la hidratación. Un único ciclo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setLayout(normalizeLayout(JSON.parse(stored)))
    } catch {}
  }, [])

  const updateLayout = (next: WidgetLayout) => {
    setLayout(next)
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }

  const toggleWidget = (key: string) => {
    if (!isWidgetKey(key)) return
    updateLayout({
      ...layout,
      hidden: layout.hidden.includes(key)
        ? layout.hidden.filter((k) => k !== key)
        : [...layout.hidden, key],
    })
  }

  const moveWidget = (key: string, dir: -1 | 1) => {
    if (!isWidgetKey(key)) return
    const idx = layout.order.indexOf(key)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= layout.order.length) return
    const order = [...layout.order]
    ;[order[idx], order[target]] = [order[target], order[idx]]
    updateLayout({ ...layout, order })
  }

  const resetLayout = () => {
    updateLayout({ order: DEFAULT_ORDER, hidden: [] })
    try {
      localStorage.removeItem(LAYOUT_STORAGE_KEY)
    } catch {}
  }

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

  // Render de cada widget del bento (mismos paneles de siempre)
  const renderWidget = (key: WidgetKey): React.ReactNode => {
    switch (key) {
      case 'hoy':
        return <HoyPanel userId={userId} />
      case 'patrimonio':
        return <PatrimonioPanel snapshots={initialSnapshots} platforms={initialPlatforms} />
      case 'gastos':
        return <GastosPanel subscriptions={initialSubscriptions} />
      case 'alertas':
        return (
          <AlertasPanel
            projects={initialProjects}
            subscriptions={initialSubscriptions}
            snapshots={initialSnapshots}
          />
        )
      case 'proyectos':
        return <ProyectosPanel projects={initialProjects} />
      case 'mercados':
        return <MercadosPanel btcPrice={btcPrice} marketData={marketData} />
      case 'actividad':
        return <ActivityFeed activity={initialActivity} />
      case 'notaRapida':
        return <NotaRapidaPanel />
      case 'notasRecientes':
        return <NotasRecientesPanel notes={initialNotes} />
      case 'evolucion':
        return <EvolucionPlataformasPanel platforms={initialPlatforms} />
      case 'proximosPagos':
        return <ProximosPagosPanel subscriptions={initialSubscriptions} />
    }
  }

  const visibleWidgets = layout.order.filter((k) => !layout.hidden.includes(k))

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
        <div className="p-3 pb-20 lg:pb-28">
          <div className="mb-1.5 flex justify-end">
            <DashboardCustomize
              labels={Object.fromEntries(
                (Object.keys(WIDGET_META) as WidgetKey[]).map((k) => [k, WIDGET_META[k].label])
              )}
              order={layout.order}
              hidden={layout.hidden}
              onToggle={toggleWidget}
              onMove={moveWidget}
              onReset={resetLayout}
            />
          </div>
          {/* Grid bento de 12 columnas: el tamaño de cada tile refleja su peso */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {visibleWidgets.map((key) => (
              <div key={key} className={SPAN_CLASS[WIDGET_META[key].span]}>
                {renderWidget(key)}
              </div>
            ))}
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
