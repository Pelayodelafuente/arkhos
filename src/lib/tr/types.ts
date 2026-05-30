// Trade Republic WebSocket response types
// Derived from empirical observation of the TR API — may change with TR updates

export interface TRCashResponse {
  amount: number
  currencyId: string
}

// compactPortfolioByType response
// Note: the SDK Position type lacks price/value fields — those come from ticker subscriptions
export interface TRPortfolioPosition {
  instrumentType: string
  name: string
  isin: string
  averageBuyIn: string
  netSize: string
  imageId?: string
  derivativeInfo?: unknown
  bondInfo?: unknown
}

export interface TRPortfolioCategory {
  categoryType: string // 'stocks', 'etfs', 'metals', 'crypto', 'bonds'
  positions: TRPortfolioPosition[]
}

export interface TRPortfolioResponse {
  categories: TRPortfolioCategory[]
  products: unknown[]
}

// ticker subscription response (per-ISIN price)
export interface TRTickerResponse {
  ask: { price: string; size: number }
  bid: { price: string; size: number }
  last: { price: string; size: number; time: number }
  pre: { price: string; size: number; time: number }
  open: { price: string }
  qualityId: string
  delta: string // % change from previous close
}

// timelineTransactions response (items format, confirmed from live API)
export interface TRTimelineItem {
  id: string
  title: string
  subtitle?: string  // action type: "Saving executed", "Completed", "Order executed", etc.
  body?: string
  icon?: string
  amount?: TRAmount
  status?: string
  timestamp: string  // ISO string e.g. "2026-05-04T15:24:03.867+0000"
  action?: { type: string; payload: string }
}

export interface TRTimelineCursors {
  nextCursor?: string
  nextId?: string
}

export interface TRTimelineResponse {
  items: TRTimelineItem[]
  cursors?: TRTimelineCursors
}

export interface TRAmount {
  currency: string
  fractionDigits: number
  value: number
}

// timelineDetailV2 response (detail of a single transaction)
export interface TRTimelineDetail {
  id: string
  sections: TRDetailSection[]
}

export interface TRDetailSection {
  title: string
  data: TRDetailRow[]
  type?: string
}

export interface TRDetailRow {
  title: string
  detail: { text?: string; value?: number; type?: string }
  id?: string
}

// performace subscription response
export interface TRPerformanceResponse {
  netReturn: string
  netReturnPercent: string
}

// Result type for the sync operation
export interface TRSyncResult {
  positionsUpdated: number
  transactionsUpserted: number
  passiveIncomeUpserted: number
  cashEur: number
}
