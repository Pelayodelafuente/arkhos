import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { formatCurrency } from '@/lib/utils/format'
import type { PlatformData } from './dashboard-view'

interface EvolucionProps {
  platforms: PlatformData[]
}

const PLATFORM_COLORS: Record<string, string> = {
  'trade-republic': 'var(--platform-tr)',
  'indexa':         'var(--platform-indexa)',
  'mintos':         'var(--module-notas)',
  'crypto':         '#F7931A',
  'horos':          'var(--module-proyectos)',
}

function getPlatformColor(slug: string): string {
  return PLATFORM_COLORS[slug] ?? 'var(--module-patrimonio)'
}

export function EvolucionPlataformasPanel({ platforms }: EvolucionProps) {
  const rows = platforms
    .filter((p) => p.current_value > 0)
    .map((p) => {
      const pl = p.current_value - p.total_invested
      // Exclude uninvested cash from the denominator, same as patrimonio module
      const investedBase = p.total_invested - (p.cash_value ?? 0)
      const pct = investedBase > 0 ? (pl / investedBase) * 100 : 0
      return { ...p, pl, pct }
    })
    .sort((a, b) => b.current_value - a.current_value)

  return (
    <DashboardPanel className="flex flex-col">
      <PanelHeader
        color="var(--module-patrimonio)"
        title="Evolución plataformas"
        chip={<ModuleChip label="PATR" color="var(--module-patrimonio)" />}
      />
      <div className="flex-1 divide-y divide-border/50">
        {rows.length === 0 ? (
          <div className="p-4 text-sm text-text-tertiary text-center">Sin datos</div>
        ) : (
          rows.map((row) => {
            const color = getPlatformColor(row.slug)
            const positive = row.pl >= 0
            const plColor = positive ? 'var(--color-gain)' : 'var(--color-loss)'
            return (
              <div key={row.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{row.name}</p>
                  <p className="text-[10px] text-text-tertiary font-mono">{formatCurrency(row.current_value, 'EUR')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-mono font-semibold" style={{ color: row.total_invested > 0 ? plColor : 'var(--text-tertiary)' }}>
                    {row.total_invested > 0 ? `${positive ? '+' : ''}${formatCurrency(row.pl, 'EUR')}` : '—'}
                  </p>
                  <p className="text-[9px] font-mono" style={{ color: row.total_invested > 0 ? plColor : 'var(--text-tertiary)' }}>
                    {row.total_invested > 0 ? `rentab. ${positive ? '+' : ''}${row.pct.toFixed(1)}%` : 'sin coste base'}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </DashboardPanel>
  )
}
