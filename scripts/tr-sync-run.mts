/**
 * Trade Republic — Sync Runner
 * Usa el cliente WebSocket propio con sesión de cookies.
 * Ejecutado por GitHub Actions (cron diario o trigger manual).
 *
 * Nota: todos los imports son ESM-compatible. La lógica de sync está
 * inlineada para evitar el boundary CJS/ESM con src/lib/tr/*.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { connectTR, fetchTickerPrice, type TRSession } from './tr-client.mts'

type SessionData = TRSession

interface TRCashResponse { amount: number; currencyId: string }
interface TRPosition { isin: string; name: string; netSize: string; averageBuyIn: string }
interface TRCategory { categoryType: string; positions: TRPosition[] }
interface TRPortfolio { categories?: TRCategory[] }
interface TRTimelineItem {
  id: string; title: string; timestamp: number; cashChangeAmount?: number
}
interface TRTimelineSection { title: string; data: TRTimelineItem[] }

interface SyncResult {
  positionsUpdated: number; transactionsUpserted: number
  passiveIncomeUpserted: number; cashEur: number
}

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')

const PASSIVE_KEYWORDS = /dividende|dividend|dividendo|zinsen|interest|interés|saveback|coupon/i
const TX_PATTERNS: Array<[RegExp, string]> = [
  [/sparplan|savings.?plan|plan de ahorro/i, 'savings_plan'],
  [/saveback/i, 'saveback'],
  [/kauf|buy|compra/i, 'buy'],
  [/verkauf|sell|venta/i, 'sell'],
  [/einzahlung|eingang|transfer.*in|depósito/i, 'transfer_in'],
  [/auszahlung|ausgang|transfer.*out|retiro/i, 'transfer_out'],
]
const PASSIVE_PATTERNS: Array<[RegExp, string]> = [
  [/dividende|dividend|dividendo/i, 'dividend'],
  [/zinsen|interest|interés/i, 'interest'],
  [/saveback/i, 'saveback'],
  [/coupon/i, 'coupon'],
]

function classifyTx(title: string) {
  for (const [re, type] of TX_PATTERNS) if (re.test(title)) return type
  return null
}
function classifyPassive(title: string) {
  for (const [re, type] of PASSIVE_PATTERNS) if (re.test(title)) return type
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runSync(userId: string, cash: TRCashResponse, portfolio: TRPortfolio, timeline: TRTimelineSection[], tickerPrices: Map<string, number>, supabase: any): Promise<SyncResult> {
  // Resolve ISINs → asset IDs
  const { data: assets } = await supabase.from('portfolio_assets').select('id, isin').eq('user_id', userId).not('isin', 'is', null)
  const isinToId = new Map<string, string>((assets ?? []).map((a: { id: string; isin: string }) => [a.isin, a.id]))

  // Resolve TR platform ID
  const { data: platform } = await supabase.from('investment_platforms').select('id').eq('user_id', userId).eq('slug', 'trade-republic').single()
  if (!platform) throw new Error('Plataforma trade-republic no encontrada')

  // Update positions
  let positionsUpdated = 0
  for (const cat of portfolio.categories ?? []) {
    for (const pos of cat.positions) {
      const assetId = isinToId.get(pos.isin)
      if (!assetId) continue
      const currentPrice = tickerPrices.get(pos.isin) ?? null
      const { error } = await supabase.from('portfolio_assets').update({
        current_quantity: parseFloat(pos.netSize),
        ...(currentPrice !== null && { current_price: currentPrice, current_price_eur: currentPrice, price_updated_at: new Date().toISOString() }),
        updated_at: new Date().toISOString(),
      }).eq('id', assetId).eq('user_id', userId)
      if (!error) positionsUpdated++
    }
  }

  // Upsert transactions
  let transactionsUpserted = 0, passiveIncomeUpserted = 0
  for (const section of timeline) {
    for (const item of section.data) {
      if (!item.id || !item.title) continue
      const amount = Math.abs(item.cashChangeAmount ?? 0)
      const date = new Date(item.timestamp).toISOString().split('T')[0]

      if (PASSIVE_KEYWORDS.test(item.title)) {
        const incomeType = classifyPassive(item.title)
        if (!incomeType) continue
        const { error } = await supabase.from('passive_income').upsert({
          user_id: userId, platform_id: platform.id, asset_id: null,
          type: incomeType, income_date: date, amount, currency: 'EUR', notes: item.title,
        }, { onConflict: 'id' })
        if (!error) passiveIncomeUpserted++
      } else {
        const txType = classifyTx(item.title)
        if (!txType) continue
        const { error } = await supabase.from('portfolio_transactions').upsert({
          user_id: userId, platform_id: platform.id, asset_id: null,
          type: txType, transaction_date: date, total_amount: amount,
          currency: 'EUR', notes: item.title, source: 'tr-api', external_id: item.id,
        }, { onConflict: 'external_id' })
        if (!error) transactionsUpserted++
      }
    }
  }

  // Daily snapshot
  const allPos = (portfolio.categories ?? []).flatMap(c => c.positions)
  const totalValue = allPos.reduce((s, p) => s + parseFloat(p.netSize) * (tickerPrices.get(p.isin) ?? 0), 0)
  const totalInvested = allPos.reduce((s, p) => s + parseFloat(p.netSize) * parseFloat(p.averageBuyIn), 0)
  const today = new Date().toISOString().split('T')[0]

  await supabase.from('portfolio_snapshots').upsert({
    user_id: userId, snapshot_date: today, platform_id: platform.id,
    total_value: totalValue + cash.amount, total_invested: totalInvested,
    cash_value: cash.amount, pl_amount: totalValue - totalInvested,
    pl_percentage: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
  }, { onConflict: 'user_id, snapshot_date, platform_id' })

  return { positionsUpdated, transactionsUpserted, passiveIncomeUpserted, cashEur: cash.amount }
}

async function main() {
  const { TR_COOKIE_FILE_B64, TR_USER_ID, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  const missing = [!TR_USER_ID && 'TR_USER_ID', !NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL', !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean)
  if (missing.length > 0) { console.error('❌ Vars faltantes:', missing.join(', ')); process.exit(1) }

  if (TR_COOKIE_FILE_B64) {
    try {
      await fs.writeFile(SESSION_FILE, Buffer.from(TR_COOKIE_FILE_B64, 'base64').toString('utf-8'), { encoding: 'utf-8', mode: 0o600 })
      console.log('📂 Sesión restaurada desde secret')
    } catch (err) { console.warn('⚠️ No se pudo restaurar sesión:', err) }
  }

  let sessionData: SessionData
  try {
    sessionData = JSON.parse(await fs.readFile(SESSION_FILE, 'utf-8')) as SessionData
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
    const client = await connectTR(sessionData)
    console.log('✅ WebSocket conectado')

    const [cash, portfolio, timelineRaw] = await Promise.all([
      client.subscribeOnce<TRCashResponse>('cash'),
      client.subscribeOnce<TRPortfolio>('compactPortfolioByType'),
      client.subscribeOnce<{ sections?: TRTimelineSection[] }>('timelineTransactions'),
    ])
    console.log(`💰 ${cash.amount.toFixed(2)} EUR | 📊 ${portfolio.categories?.length ?? 0} cats | 📋 ${(timelineRaw.sections ?? []).flatMap(s => s.data).length} txs`)

    const allIsins = (portfolio.categories ?? []).flatMap(c => c.positions.map(p => p.isin))
    const tickerPrices = new Map<string, number>()
    await Promise.allSettled(allIsins.map(async isin => {
      const price = await fetchTickerPrice(client, isin)
      if (price !== null) tickerPrices.set(isin, price)
    }))
    console.log(`📈 Precios: ${tickerPrices.size}/${allIsins.length}`)
    client.close()

    const result = await runSync(TR_USER_ID!, cash, portfolio, timelineRaw.sections ?? [], tickerPrices, supabase)
    console.log(`✅ Posiciones: ${result.positionsUpdated} | Txs: ${result.transactionsUpserted} | Ingresos: ${result.passiveIncomeUpserted}`)

    if (syncLogId) {
      await supabase.from('tr_sync_log').update({
        status: 'success', finished_at: new Date().toISOString(),
        positions_updated: result.positionsUpdated, transactions_upserted: result.transactionsUpserted,
        passive_income_upserted: result.passiveIncomeUpserted, cash_eur: result.cashEur,
      }).eq('id', syncLogId)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ Error:', msg)
    if (syncLogId) await supabase.from('tr_sync_log').update({ status: 'error', finished_at: new Date().toISOString(), error_message: msg }).eq('id', syncLogId)
    process.exit(1)
  }
}

main().catch((err: unknown) => { console.error('Error inesperado:', err); process.exit(1) })
