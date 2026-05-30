/**
 * Trade Republic — Sync Runner
 * Usa el cliente WebSocket propio (no trapi) con sesión de cookies.
 * Ejecutado por GitHub Actions (cron diario o trigger manual).
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

import type { Database } from '../src/lib/supabase/types.js'
import { connectTR, fetchTickerPrice } from '../src/lib/tr/websocket.js'
import { runTRSync } from '../src/lib/tr/sync.js'
import type { TRCashResponse, TRPortfolioResponse, TRTimelineSection } from '../src/lib/tr/types.js'

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')

interface SessionData {
  rawCookies: string[]
}

async function main() {
  const {
    TR_COOKIE_FILE_B64,
    TR_USER_ID,
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = process.env

  const missing = (
    [
      !TR_USER_ID && 'TR_USER_ID',
      !NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
      !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    ] as (string | false)[]
  ).filter((v): v is string => Boolean(v))

  if (missing.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missing.join(', '))
    process.exit(1)
  }

  // Restore session file from GitHub Secret
  if (TR_COOKIE_FILE_B64) {
    try {
      const content = Buffer.from(TR_COOKIE_FILE_B64, 'base64').toString('utf-8')
      await fs.writeFile(SESSION_FILE, content, { encoding: 'utf-8', mode: 0o600 })
      console.log('📂 Sesión restaurada desde secret')
    } catch (err) {
      console.warn('⚠️ No se pudo restaurar sesión:', err)
    }
  }

  let sessionData: SessionData
  try {
    const content = await fs.readFile(SESSION_FILE, 'utf-8')
    sessionData = JSON.parse(content) as SessionData
  } catch {
    console.error('❌ No se encontró sesión. Ejecuta pnpm tr:auth localmente y actualiza TR_COOKIE_FILE_B64.')
    process.exit(1)
  }

  const supabase = createClient<Database>(NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  // Log sync start
  const { data: syncLog } = await supabase
    .from('tr_sync_log')
    .insert({
      user_id: TR_USER_ID!,
      status: 'running',
      trigger_source:
        process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' ? 'manual' : 'cron',
    })
    .select('id')
    .single()

  const syncLogId = syncLog?.id
  console.log(`[${new Date().toISOString()}] Sync iniciado (log: ${syncLogId ?? 'n/a'})`)

  try {
    console.log('🔌 Conectando al WebSocket de TR...')
    const client = await connectTR(sessionData.rawCookies)
    console.log('✅ Conectado')

    // Fetch cash, portfolio and timeline in parallel
    const [cash, portfolio, timelineRaw] = await Promise.all([
      client.subscribeOnce<TRCashResponse>('cash'),
      client.subscribeOnce<TRPortfolioResponse>('compactPortfolioByType'),
      client.subscribeOnce<{ sections?: TRTimelineSection[] }>('timelineTransactions'),
    ])

    console.log(`💰 Cash: ${cash.amount.toFixed(2)} EUR`)
    console.log(`📊 Categorías: ${portfolio.categories?.length ?? 0}`)
    const allItems = (timelineRaw.sections ?? []).flatMap(s => s.data)
    console.log(`📋 Transacciones: ${allItems.length}`)

    // Fetch ticker prices for each ISIN
    const allIsins = (portfolio.categories ?? []).flatMap(c => c.positions.map(p => p.isin))
    const tickerPrices = new Map<string, number>()

    console.log(`📈 Fetching precios para ${allIsins.length} ISINs...`)
    await Promise.allSettled(
      allIsins.map(async (isin) => {
        const price = await fetchTickerPrice(client, isin)
        if (price !== null) tickerPrices.set(isin, price)
      })
    )
    console.log(`✅ Precios: ${tickerPrices.size}/${allIsins.length}`)

    client.close()

    const result = await runTRSync(
      TR_USER_ID!,
      cash,
      { categories: portfolio.categories ?? [], products: [] },
      timelineRaw.sections ?? [],
      tickerPrices,
      supabase
    )

    console.log('✅ Sync completado:')
    console.log(`   Posiciones:   ${result.positionsUpdated}`)
    console.log(`   Transacciones: ${result.transactionsUpserted}`)
    console.log(`   Ingresos:      ${result.passiveIncomeUpserted}`)

    if (syncLogId) {
      await supabase.from('tr_sync_log').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        positions_updated: result.positionsUpdated,
        transactions_upserted: result.transactionsUpserted,
        passive_income_upserted: result.passiveIncomeUpserted,
        cash_eur: result.cashEur,
      }).eq('id', syncLogId)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('❌ Error en sync:', message)
    if (syncLogId) {
      await supabase.from('tr_sync_log').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: message,
      }).eq('id', syncLogId)
    }
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
