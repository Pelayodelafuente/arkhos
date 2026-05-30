/**
 * Trade Republic — Sync Runner
 *
 * Ejecutado por GitHub Actions (cron diario o trigger manual).
 * No se llama desde Next.js — es un script Node.js independiente.
 *
 * Requiere variables de entorno:
 *   TR_PHONE, TR_PIN, TR_COOKIE_FILE_B64, TR_USER_ID,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { TradeRepublicApi, createMessage } from 'trapi'
import type { Portfolio } from 'trapi'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

import type { Database } from '../src/lib/supabase/types'
import type { TRCashResponse, TRTimelineSection, TRTickerResponse } from '../src/lib/tr/types'
import { runTRSync } from '../src/lib/tr/sync'

function subscribeOnce<T>(
  api: TradeRepublicApi,
  type: Parameters<typeof createMessage>[0],
  data?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout en ${type}`)), 15_000)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.subscribeOnce(createMessage(type as any, data as any), (raw) => {
      clearTimeout(timeout)
      if (raw === null) reject(new Error(`Null response para ${type}`))
      else resolve(JSON.parse(raw) as T)
    })
  })
}

async function main() {
  const {
    TR_PHONE,
    TR_PIN,
    TR_COOKIE_FILE_B64,
    TR_USER_ID,
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = process.env

  const missingVars = (
    [
      !TR_PHONE && 'TR_PHONE',
      !TR_PIN && 'TR_PIN',
      !TR_USER_ID && 'TR_USER_ID',
      !NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
      !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    ] as (string | false)[]
  ).filter((v): v is string => Boolean(v))

  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars.join(', '))
    process.exit(1)
  }

  // Restore session file from GitHub Secret
  const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')

  if (TR_COOKIE_FILE_B64) {
    try {
      const content = Buffer.from(TR_COOKIE_FILE_B64, 'base64').toString('utf-8')
      await fs.writeFile(SESSION_FILE, content, { encoding: 'utf-8', mode: 0o600 })
      console.log('📂 Sesión restaurada desde secret')
    } catch (err) {
      console.warn('⚠️  No se pudo restaurar el archivo de sesión:', err)
    }
  } else {
    console.warn('⚠️  TR_COOKIE_FILE_B64 no configurado — el login fallará en CI sin sesión guardada')
  }

  // Supabase admin client
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
    const api = new TradeRepublicApi(TR_PHONE!, TR_PIN!)
    console.log('🔐 Conectando a Trade Republic...')

    const loginOk = await api.login()
    if (!loginOk) throw new Error('Login fallido — sesión expirada. Ejecuta pnpm tr:auth localmente y actualiza TR_COOKIE_FILE_B64 en GitHub Secrets.')

    console.log('✅ Sesión válida')

    // Fetch data in parallel
    const [cash, portfolio, timeline] = await Promise.all([
      subscribeOnce<TRCashResponse>(api, 'cash'),
      subscribeOnce<Portfolio>(api, 'compactPortfolioByType'),
      subscribeOnce<{ sections?: TRTimelineSection[] }>(api, 'timelineTransactions'),
    ])

    console.log(`💰 Cash: ${cash.amount.toFixed(2)} EUR`)
    console.log(`📊 Categorías: ${portfolio.categories?.length ?? 0}`)
    const allItems = (timeline.sections ?? []).flatMap((s) => s.data)
    console.log(`📋 Transacciones: ${allItems.length}`)

    // Fetch current prices via ticker for each ISIN
    const allIsins = (portfolio.categories ?? []).flatMap((c) => c.positions.map((p) => p.isin))
    const tickerPrices = new Map<string, number>()

    console.log(`📈 Fetching precios para ${allIsins.length} ISINs...`)

    await Promise.allSettled(
      allIsins.map(async (isin) => {
        try {
          const ticker = await subscribeOnce<TRTickerResponse>(api, 'ticker', {
            id: `${isin}.LSX`,
          })
          const price = parseFloat(ticker.last?.price ?? '0')
          if (price > 0) tickerPrices.set(isin, price)
        } catch {
          // Price not available on LSX — will be skipped
        }
      })
    )

    console.log(`✅ Precios obtenidos: ${tickerPrices.size}/${allIsins.length}`)

    // Run sync against existing patrimonio tables
    const result = await runTRSync(
      TR_USER_ID!,
      cash,
      { categories: portfolio.categories ?? [], products: [] },
      timeline.sections ?? [],
      tickerPrices,
      supabase
    )

    console.log('✅ Sync completado:')
    console.log(`   Posiciones actualizadas: ${result.positionsUpdated}`)
    console.log(`   Transacciones upserted:  ${result.transactionsUpserted}`)
    console.log(`   Ingresos pasivos:         ${result.passiveIncomeUpserted}`)

    if (syncLogId) {
      await supabase
        .from('tr_sync_log')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          positions_updated: result.positionsUpdated,
          transactions_upserted: result.transactionsUpserted,
          passive_income_upserted: result.passiveIncomeUpserted,
          cash_eur: result.cashEur,
        })
        .eq('id', syncLogId)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('❌ Error en sync:', message)

    if (syncLogId) {
      await supabase
        .from('tr_sync_log')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          error_message: message,
        })
        .eq('id', syncLogId)
    }

    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
