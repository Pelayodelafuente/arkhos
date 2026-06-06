'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { formatCurrency } from '@/lib/utils/format'
import type { SnapshotData, PlatformData } from './dashboard-view'

interface PatrimonioPanelProps {
  snapshots: SnapshotData[]
  platforms: PlatformData[]
}

const PLATFORM_COLORS: Record<string, string> = {
  'trade-republic': 'var(--platform-tr)',
  'indexa-capital': 'var(--platform-indexa)',
  'mintos': 'var(--module-notas)',
  'bit2me': '#F7931A',
}

function getPlatformColor(slug: string): string {
  return PLATFORM_COLORS[slug] ?? 'var(--module-patrimonio)'
}

interface TooltipPayloadEntry {
  value: number
  name: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <p className="text-[11px] text-text-tertiary mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-xs text-foreground">
          {formatCurrency(p.value, 'EUR')}
        </p>
      ))}
    </div>
  )
}

export function PatrimonioPanel({ snapshots, platforms }: PatrimonioPanelProps) {
  const chartData = snapshots.map((s) => ({
    mes: new Date(s.snapshot_date).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
    total: Math.round(s.total_value),
    invertido: Math.round(s.invested_value),
  }))

  const totalValue = platforms.reduce((s, p) => s + p.current_value, 0)

  const platformsWithPct = platforms.map((p) => ({
    ...p,
    pct: totalValue > 0 ? (p.current_value / totalValue) * 100 : 0,
  }))

  return (
    <DashboardPanel>
      <PanelHeader
        color="var(--module-patrimonio)"
        title="Evolución del Patrimonio"
        chip={<ModuleChip label="PATRIMONIO" color="var(--module-patrimonio)" />}
      />
      <div className="px-4 pb-2">
        {chartData.length >= 2 ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="grad-patrimonio-total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--module-patrimonio)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--module-patrimonio)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="grad-patrimonio-invested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--module-gastos)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--module-gastos)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="invertido"
                  stroke="var(--module-gastos)"
                  strokeWidth={1}
                  fill="url(#grad-patrimonio-invested)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--module-patrimonio)"
                  strokeWidth={2}
                  fill="url(#grad-patrimonio-total)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-sm text-text-muted">
            Sin datos de histórico todavía
          </div>
        )}
      </div>
      {platformsWithPct.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
            Distribución
          </p>
          <div className="space-y-2">
            {platformsWithPct.map((p) => {
              const color = getPlatformColor(p.slug)
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-foreground flex-1 truncate">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full overflow-hidden bg-sand w-16">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p.pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-text-tertiary w-8 text-right">
                      {p.pct.toFixed(0)}%
                    </span>
                    <span className="font-mono text-[11px] text-foreground w-20 text-right">
                      {formatCurrency(p.current_value, 'EUR').replace(',00', '')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </DashboardPanel>
  )
}
