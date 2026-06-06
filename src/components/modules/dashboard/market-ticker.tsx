'use client'

const TICKER_ITEMS = [
  { sym: 'BTC', val: '—', up: true },
  { sym: 'ETH', val: '—', up: false },
  { sym: 'S&P 500', val: '—', up: true },
  { sym: 'EUR/USD', val: '1.0823', up: true },
  { sym: 'Gold', val: '$3,120', up: true },
  { sym: 'VIX', val: '18.4', up: false },
  { sym: 'DXY', val: '104.2', up: true },
  { sym: 'US 10Y', val: '4.28%', up: false },
  { sym: 'Fear&Greed', val: '62', up: true },
]

const repeated = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS]

export function MarketTicker() {
  return (
    <div
      className="relative flex items-center h-7 overflow-hidden flex-shrink-0 select-none"
      style={{ backgroundColor: 'var(--bg-sidebar)' }}
      aria-label="Ticker de mercado"
    >
      <div className="animate-ticker flex items-center gap-0 whitespace-nowrap">
        {repeated.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-4">
            <span className="text-[11px] font-semibold tracking-wide" style={{ color: 'var(--sb-text-secondary)' }}>
              {item.sym}
            </span>
            <span className="text-[11px] font-mono" style={{ color: item.up ? 'var(--color-gain)' : 'var(--sb-text-primary)' }}>
              {item.val}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--sb-text-muted)' }}>
              {item.up ? '▲' : '▼'}
            </span>
            <span style={{ color: 'var(--sb-border)', fontSize: '10px' }} className="ml-3">·</span>
          </span>
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-8"
        style={{ background: `linear-gradient(to right, var(--bg-sidebar), transparent)` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8"
        style={{ background: `linear-gradient(to left, var(--bg-sidebar), transparent)` }}
        aria-hidden="true"
      />
    </div>
  )
}
