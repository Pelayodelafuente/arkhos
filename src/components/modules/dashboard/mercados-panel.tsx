'use client'

import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { DashboardSparkline } from './dashboard-sparkline'

const WATCHLIST = [
  { sym: 'BTC', name: 'Bitcoin', price: '—', chg: '—', up: true, color: '#F7931A' },
  { sym: 'ETH', name: 'Ethereum', price: '—', chg: '—', up: false, color: '#627EEA' },
  { sym: 'IGLN', name: 'Gold ETF', price: '—', chg: '—', up: true, color: 'var(--module-notas)' },
  { sym: 'CSPX', name: 'S&P 500 ETF', price: '—', chg: '—', up: true, color: 'var(--module-patrimonio)' },
  { sym: 'DXY', name: 'US Dollar', price: '104.2', chg: '+0.1%', up: true, color: 'var(--module-gastos)' },
] as const

const MACRO_INDICATORS = [
  { label: 'VIX', val: '18.4', desc: 'Baja vol.', status: 'positive' },
  { label: 'Fear & Greed', val: '62', desc: 'Codicia', status: 'warning' },
  { label: 'US 10Y', val: '4.28%', desc: 'Estable', status: 'neutral' },
  { label: 'DXY', val: '104.2', desc: 'USD fuerte', status: 'negative' },
  { label: 'EUR/USD', val: '1.0823', desc: '+0.12%', status: 'positive' },
  { label: 'Gold', val: '$3,120', desc: '+0.63%', status: 'positive' },
] as const

const STATUS_COLOR: Record<string, string> = {
  positive: 'var(--module-patrimonio)',
  negative: 'var(--urgency-critical)',
  warning: 'var(--urgency-warning)',
  neutral: 'var(--text-tertiary)',
}

const DEMO_SPARK = [42, 38, 45, 40, 43, 41, 46, 44, 48, 45]

export function MercadosPanel() {
  return (
    <DashboardPanel>
      <PanelHeader
        color="var(--module-mercados)"
        title="Mercados"
        chip={<ModuleChip label="MERCADOS" color="var(--module-mercados)" />}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="px-4 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
            Watchlist
          </p>
          <div className="space-y-2.5">
            {WATCHLIST.map((item) => (
              <div key={item.sym} className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{item.sym}</span>
                    <span className="text-[10px] text-text-muted truncate">{item.name}</span>
                  </div>
                </div>
                <DashboardSparkline
                  data={DEMO_SPARK}
                  color={item.color}
                  width={48}
                  height={20}
                />
                <div className="text-right flex-shrink-0 w-16">
                  <div className="font-mono text-xs text-foreground">{item.price}</div>
                  <div
                    className="font-mono text-[10px]"
                    style={{ color: item.up ? 'var(--module-patrimonio)' : 'var(--urgency-critical)' }}
                  >
                    {item.chg}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4 pt-4 sm:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-3">
            Macro
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MACRO_INDICATORS.map((ind) => (
              <div key={ind.label} className="p-2 rounded-lg bg-sand">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[10px] text-text-tertiary truncate">{ind.label}</span>
                  <span
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLOR[ind.status] ?? 'var(--text-tertiary)' }}
                    aria-hidden="true"
                  />
                </div>
                <div className="font-mono text-sm font-semibold text-foreground">{ind.val}</div>
                <div
                  className="text-[10px]"
                  style={{ color: STATUS_COLOR[ind.status] ?? 'var(--text-tertiary)' }}
                >
                  {ind.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 pt-1 border-t border-border">
        <p className="text-[10px] text-text-muted text-center">
          Actualización manual · próximamente en tiempo real
        </p>
      </div>
    </DashboardPanel>
  )
}
