import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { formatCurrency } from '@/lib/utils/format'
import type { PlatformData, AssetData } from './dashboard-view'

interface EvolucionProps {
  platforms: PlatformData[]
  assets: AssetData[]
}

const PLATFORM_COLORS: Record<string, string> = {
  'trade-republic': 'var(--platform-tr)',
  'indexa-capital': 'var(--platform-indexa)',
  'mintos':         'var(--module-notas)',
  'bit2me':         '#F7931A',
}

function getPlatformColor(slug: string): string {
  return PLATFORM_COLORS[slug] ?? 'var(--module-patrimonio)'
}

export function EvolucionPlataformasPanel({ platforms, assets }: EvolucionProps) {
  const investedMap: Record<string, number> = {}
  for (const asset of assets) {
    if (!asset.platform_id) continue
    investedMap[asset.platform_id] = (investedMap[asset.platform_id] ?? 0) + asset.total_invested
  }

  const rows = platforms
    .filter((p) => p.current_value > 0)
    .map((p) => {
      const invested = investedMap[p.id] ?? 0
      const pl = p.current_value - invested
      const pct = invested > 0 ? (pl / invested) * 100 : 0
      return { ...p, invested, pl, pct }
    })
    .sort((a, b) => b.pct - a.pct)

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
                  <p className="text-[12px] font-mono font-semibold" style={{ color: plColor }}>
                    {positive ? '+' : ''}{row.pct.toFixed(1)}%
                  </p>
                  <p className="text-[9px] font-mono" style={{ color: plColor }}>
                    {positive ? '+' : ''}{formatCurrency(row.pl, 'EUR')}
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
