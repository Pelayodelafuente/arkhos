/**
 * Trade Republic — Sync Runner
 * Ejecutado por GitHub Actions (cron diario o trigger manual).
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { connectTR, fetchTickerPrice, type TRClient, type TRSession } from './tr-client.mts'

// TR API types
interface TRCashItem { accountNumber: string; currencyId: string; amount: number }
interface TRAccountPairsResponse {
  accounts: Array<{ securitiesAccountNumber: string; cashAccountNumber: string }>
}
interface TRPosition { isin: string; name: string; netSize: string; averageBuyIn: string }
interface TRCategory { categoryType: string; positions: TRPosition[] }
interface TRPortfolio { categories?: TRCategory[] }
interface TRAmount { currency: string; value: number; fractionDigits: number }
interface TRTimelineItem {
  id: string; timestamp: string; title: string; subtitle?: string
  amount?: TRAmount; status?: string; action?: { type: string; payload: string }
}
interface TRTimelineCursors { nextCursor?: string; nextId?: string }
interface TRTimelineResponse { items: TRTimelineItem[]; cursors?: TRTimelineCursors }

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')

// Passive income keywords checked against title+subtitle
const PASSIVE_KEYWORDS = /dividende|dividend|dividendo|zinsen|interest|interés|saveback|coupon/i

const PASSIVE_PATTERNS: Array<[RegExp, string]> = [
  [/dividende|dividend|dividendo/i, 'dividend'],
  [/zinsen|interest|interés/i, 'interest'],
  [/saveback/i, 'saveback'],
  [/coupon/i, 'coupon'],
]

// TR subtitle keywords (confirmed from live API):
//   "Saving executed"  → savings_plan
//   "Completed" +amt   → transfer_in / transfer_out (sign of amount)
//   "Order executed"   → buy (negative) or sell (positive)
function classifyTx(title: string, subtitle: string | undefined, amount: number): string | null {
  const sub = subtitle ?? ''
  if (/saving.?exec|sparplan.*exec|savings.*plan/i.test(sub)) return 'savings_plan'
  if (/saveback/i.test(sub) || /saveback/i.test(title)) return 'saveback'
  if (/order.?exec|kauf\b|purchase/i.test(sub)) return amount < 0 ? 'buy' : 'sell'
  if (/verkauf|sell.*exec|sale/i.test(sub)) return 'sell'
  if (/completed/i.test(sub)) return amount >= 0 ? 'transfer_in' : 'transfer_out'
  return null
}

function classifyPassive(title: string, subtitle: string | undefined): string | null {
  const text = `${title} ${subtitle ?? ''}`
  for (const [re, type] of PASSIVE_PATTERNS) if (re.test(text)) return type
  return null
}

// Fetches ALL timeline pages via cursor pagination (up to maxPages × ~30 items each)
async function fetchAllTimeline(client: TRClient, maxPages = 30): Promise<TRTimelineItem[]> {
  const all: TRTimelineItem[] = []
  let cursors: TRTimelineCursors | undefined
  for (let page = 0; page < maxPages; page++) {
    const params = cursors ? { cursors } : undefined
    const resp = await client.subscribeOnce<TRTimelineResponse>('timelineTransactions', params)
    const batch = resp.items ?? []
    all.push(...batch)
    console.log(`    Página ${page + 1}: ${batch.length} items (total: ${all.length})`)
    if (!resp.cursors?.nextCursor) break
    cursors = resp.cursors
  }
  return all
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runSync(userId: string, cashEur: number, portfolio: TRPortfolio, items: TRTimelineItem[], tickerPrices: Map<string, number>, supabase: any) {
  const { data: assets } = await supabase
    .from('portfolio_assets').select('id, isin').eq('user_id', userId).not('isin', 'is', null)
  const isinToId = new Map<string, string>(
    (assets ?? []).map((a: { id: string; isin: string }) => [a.isin, a.id])
  )

  const { data: platform } = await supabase
    .from('investment_platforms').select('id').eq('user_id', userId).eq('slug', 'trade-republic').single()
  if (!platform) throw new Error('Plataforma trade-republic no encontrada')

  // Update positions: current quantity, avg buy price, and current price
  let positionsUpdated = 0
  for (const cat of portfolio.categories ?? []) {
    for (const pos of cat.positions) {
      const assetId = isinToId.get(pos.isin)
      if (!assetId) continue
      const price = tickerPrices.get(pos.isin) ?? null
      const { error } = await supabase.from('portfolio_assets').update({
        current_quantity: parseFloat(pos.netSize),
        avg_buy_price: parseFloat(pos.averageBuyIn),
        ...(price !== null && {
          current_price: price,
          current_price_eur: price,
          price_updated_at: new Date().toISOString(),
        }),
        updated_at: new Date().toISOString(),
      }).eq('id', assetId).eq('user_id', userId)
      if (!error) positionsUpdated++
    }
  }

  // Upsert transactions and passive income from full timeline
  let transactionsUpserted = 0
  let passiveIncomeUpserted = 0
  for (const item of items) {
    if (!item.id || !item.title) continue
    const amount = item.amount?.value ?? 0
    const absAmount = Math.abs(amount)
    const date = new Date(item.timestamp).toISOString().split('T')[0]
    const searchText = `${item.title} ${item.subtitle ?? ''}`

    if (PASSIVE_KEYWORDS.test(searchText)) {
      const incomeType = classifyPassive(item.title, item.subtitle)
      if (!incomeType) continue
      const { error } = await supabase.from('passive_income').upsert({
        user_id: userId, platform_id: platform.id, asset_id: null,
        type: incomeType, income_date: date, amount: absAmount, currency: 'EUR',
        notes: item.title,
      }, { onConflict: 'id' })
      if (!error) passiveIncomeUpserted++
    } else {
      const txType = classifyTx(item.title, item.subtitle, amount)
      if (!txType) continue
      const { error } = await supabase.from('portfolio_transactions').upsert({
        user_id: userId, platform_id: platform.id, asset_id: null,
        type: txType, transaction_date: date, total_amount: absAmount,
        currency: 'EUR', notes: item.title, source: 'tr-api', external_id: item.id,
      }, { onConflict: 'external_id' })
      if (!error) transactionsUpserted++
    }
  }

  // Daily portfolio snapshot
  const allPos = (portfolio.categories ?? []).flatMap(c => c.positions)
  const totalValue = allPos.reduce((s, p) => s + parseFloat(p.netSize) * (tickerPrices.get(p.isin) ?? 0), 0)
  const totalInvested = allPos.reduce((s, p) => s + parseFloat(p.netSize) * parseFloat(p.averageBuyIn), 0)
  const today = new Date().toISOString().split('T')[0]

  await supabase.from('portfolio_snapshots').upsert({
    user_id: userId, snapshot_date: today, platform_id: platform.id,
    total_value: totalValue + cashEur, total_invested: totalInvested,
    cash_value: cashEur, pl_amount: totalValue - totalInvested,
    pl_percentage: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
  }, { onConflict: 'user_id, snapshot_date, platform_id' })

  return { positionsUpdated, transactionsUpserted, passiveIncomeUpserted, cashEur }
}

async function main() {
  const {
    TR_COOKIE_FILE_B64, TR_USER_ID, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  } = process.env

  const missing = [
    !TR_USER_ID && 'TR_USER_ID',
    !NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
    !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean)
  if (missing.length > 0) { console.error('❌ Vars faltantes:', missing.join(', ')); process.exit(1) }

  if (TR_COOKIE_FILE_B64) {
    try {
      await fs.writeFile(
        SESSION_FILE,
        Buffer.from(TR_COOKIE_FILE_B64, 'base64').toString('utf-8'),
        { encoding: 'utf-8', mode: 0o600 }
      )
      console.log('📂 Sesión restaurada desde secret')
    } catch (err) { console.warn('⚠️ No se pudo restaurar sesión:', err) }
  }

  let session: TRSession
  try {
    session = JSON.parse(await fs.readFile(SESSION_FILE, 'utf-8')) as TRSession
  } catch {
    console.error('❌ No hay sesión. Ejecuta pnpm tr:auth y actualiza TR_COOKIE_FILE_B64.')
    process.exit(1)
  }

  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  const { data: syncLog } = await supabase.from('tr_sync_log').insert({
    user_id: TR_USER_ID!, status: 'running',
    trigger_source: process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' ? 'manual' : 'cron',
  }).select('id').single()
  const syncLogId = syncLog?.id as string | undefined

  console.log(`[${new Date().toISOString()}] Sync iniciado`)

  try {
    const client = await connectTR(session)
    console.log('✅ WebSocket conectado')

    const cashArray = await client.subscribeOnce<TRCashItem[]>('cash')
    const cashItem = Array.isArray(cashArray) ? cashArray[0] : cashArray as unknown as TRCashItem
    const cashEur = cashItem?.amount ?? 0
    console.log(`💰 Cash: ${cashEur.toFixed(2)} EUR`)

    const accountPairs = await client.subscribeOnce<TRAccountPairsResponse>('accountPairs')
    const secAccNo = accountPairs.accounts?.[0]?.securitiesAccountNumber
    console.log(`🏦 Cuenta valores: ${secAccNo}`)

    const portfolio = await client.subscribeOnce<TRPortfolio>(
      'compactPortfolioByType',
      secAccNo ? { secAccNo } : undefined
    )
    const allIsins = (portfolio.categories ?? []).flatMap(c => c.positions.map(p => p.isin))
    console.log(`📊 ${allIsins.length} posiciones`)

    console.log('📋 Obteniendo historial completo (paginado)...')
    const items = await fetchAllTimeline(client)
    console.log(`📋 Total timeline: ${items.length} items`)

    const tickerPrices = new Map<string, number>()
    await Promise.allSettled(allIsins.map(async isin => {
      const price = await fetchTickerPrice(client, isin)
      if (price !== null) tickerPrices.set(isin, price)
    }))
    console.log(`📈 Precios: ${tickerPrices.size}/${allIsins.length}`)

    // Close WebSocket before DB operations (no longer needed)
    client.close()

    const result = await runSync(TR_USER_ID!, cashEur, portfolio, items, tickerPrices, supabase)
    console.log(
      `✅ Sync: pos=${result.positionsUpdated} txs=${result.transactionsUpserted} ingresos=${result.passiveIncomeUpserted}`
    )

    if (syncLogId) {
      await supabase.from('tr_sync_log').update({
        status: 'success', finished_at: new Date().toISOString(),
        positions_updated: result.positionsUpdated,
        transactions_upserted: result.transactionsUpserted,
        passive_income_upserted: result.passiveIncomeUpserted,
        cash_eur: result.cashEur,
      }).eq('id', syncLogId)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ Error:', msg)
    if (syncLogId) {
      await supabase.from('tr_sync_log').update({
        status: 'error', finished_at: new Date().toISOString(), error_message: msg,
      }).eq('id', syncLogId)
    }
    process.exit(1)
  }
}

main().catch((err: unknown) => { console.error('Error:', err); process.exit(1) })
