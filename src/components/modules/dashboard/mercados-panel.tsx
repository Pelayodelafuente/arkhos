'use client'

import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import { DashboardSparkline } from './dashboard-sparkline'
import type { MarketData } from './dashboard-view'

const DEMO_SPARK = [42, 38, 45, 40, 43, 41, 46, 44, 48, 45]

const STATUS_COLOR: Record<string, string> = {
  positive: 'var(--module-patrimonio)',
  negative: 'var(--urgency-critical)',
  warning: 'var(--urgency-warning)',
  neutral: 'var(--text-tertiary)',
}

function fmtPrice(v: number | null, decimals = 0): string {
  if (v === null || v === 0) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(v)
}

function fmtChange(v: number | null): string {
  if (v === null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function changeColor(v: number | null): string {
  if (v === null) return 'var(--text-muted)'
  return v >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'
}

function fgStatus(value: number): string {
  if (value >= 75) return 'warning'
  if (value >= 55) return 'positive'
  if (value <= 25) return 'negative'
  if (value <= 45) return 'negative'
  return 'neutral'
}

interface MercadosPanelProps {
  btcPrice?: number | null
  marketData?: MarketData | null
}

export function MercadosPanel({ btcPrice, marketData }: MercadosPanelProps) {
  const md = marketData ?? null

  const watchlist = [
    {
      sym: 'BTC',
      name: 'Bitcoin',
      color: '#F7931A',
      price: fmtPrice(btcPrice ?? null),
      chg: fmtChange(md?.btcChange24h ?? null),
      chgColor: changeColor(md?.btcChange24h ?? null),
    },
    {
      sym: 'ETH',
      name: 'Ethereum',
      color: '#627EEA',
      price: fmtPrice(md?.ethPrice ?? null),
      chg: fmtChange(md?.ethChange24h ?? null),
      chgColor: changeColor(md?.ethChange24h ?? null),
    },
    {
      sym: 'IGLN',
      name: 'Gold ETF',
      color: 'var(--module-notas)',
      price: '—',
      chg: '—',
      chgColor: 'var(--text-muted)',
    },
    {
      sym: 'CSPX',
      name: 'S&P 500 ETF',
      color: 'var(--module-patrimonio)',
      price: '—',
      chg: '—',
      chgColor: 'var(--text-muted)',
    },
    {
      sym: 'DXY',
      name: 'US Dollar',
      color: 'var(--module-gastos)',
      price: '—',
      chg: '—',
      chgColor: 'var(--text-muted)',
    },
  ]

  const fng = md?.fearGreed ?? null
  const eurUsd = md?.eurUsd ?? null

  const macro = [
    {
      label: 'VIX',
      val: '—',
      desc: 'vol. implícita',
      status: 'neutral',
    },
    {
      label: 'Fear & Greed',
      val: fng ? `${fng.value}` : '—',
      desc: fng ? fng.label : 'sentimiento',
      status: fng ? fgStatus(fng.value) : 'neutral',
    },
    {
      label: 'US 10Y',
      val: '—',
      desc: 'bono 10 años',
      status: 'neutral',
    },
    {
      label: 'DXY',
      val: '—',
      desc: 'índice dólar',
      status: 'neutral',
    },
    {
      label: 'EUR/USD',
      val: eurUsd ? eurUsd.toFixed(4) : '—',
      desc: 'tipo de cambio',
      status: eurUsd
        ? eurUsd >= 1.1 ? 'positive' : eurUsd <= 1.0 ? 'negative' : 'neutral'
        : 'neutral',
    },
    {
      label: 'Gold',
      val: '—',
      desc: 'oro spot',
      status: 'neutral',
    },
  ]

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
            {watchlist.map((item) => (
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
                <div className="text-right flex-shrink-0 w-20">
                  <div className="font-mono text-xs text-foreground">{item.price}</div>
                  <div className="font-mono text-[10px]" style={{ color: item.chgColor }}>
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
            {macro.map((ind) => (
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
      <div className="px-4 pb-3 pt-1 border-t border-border flex items-center justify-between">
        <p className="text-[10px] text-text-muted">
          BTC · ETH · F&G actualizados · resto en módulo Mercados
        </p>
        <a href="/mercados" className="text-[10px] font-medium hover:underline" style={{ color: 'var(--module-mercados)' }}>
          Ir a Mercados →
        </a>
      </div>
    </DashboardPanel>
  )
}
