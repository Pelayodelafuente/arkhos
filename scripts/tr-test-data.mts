/**
 * Trade Republic — Data Test Script
 * Usage: pnpm tr:test (ejecutar en tu terminal, no con !)
 */

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { connectTR, fetchTickerPrice, type TRClient, type TRSession } from './tr-client.mts'

// Verified TR API types
interface TRCashItem { accountNumber: string; currencyId: string; amount: number }
interface TRAccountPair {
  securitiesAccountNumber: string; cashAccountNumber: string
  productType: string; currency: string
}
interface TRAccountPairsResponse { authAccountId: string; accounts: TRAccountPair[] }
interface TRPortfolioPosition {
  isin: string; name: string; netSize: string; averageBuyIn: string
}
interface TRPortfolioCategory { categoryType: string; positions: TRPortfolioPosition[] }
interface TRPortfolioResponse { categories?: TRPortfolioCategory[] }
interface TRAmount { currency: string; value: number; fractionDigits: number }
interface TRTimelineItem {
  id: string
  timestamp: string  // ISO string e.g. "2026-05-04T15:24:03.867+0000"
  title: string
  subtitle?: string
  amount?: TRAmount
  status?: string
  action?: { type: string; payload: string }
}
interface TRTimelineCursors { nextCursor?: string; nextId?: string }
interface TRTimelineResponse { items: TRTimelineItem[]; cursors?: TRTimelineCursors }

async function fetchAllTimeline(client: TRClient, maxPages = 30): Promise<TRTimelineItem[]> {
  const all: TRTimelineItem[] = []
  let cursors: TRTimelineCursors | undefined
  for (let page = 0; page < maxPages; page++) {
    const params = cursors ? { cursors } : undefined
    const resp = await client.subscribeOnce<TRTimelineResponse>('timelineTransactions', params)
    all.push(...(resp.items ?? []))
    if (!resp.cursors?.nextCursor) break
    cursors = resp.cursors
  }
  return all
}

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Trade Republic — Test de Datos')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  let sessionData: TRSession
  try {
    sessionData = JSON.parse(await fs.readFile(SESSION_FILE, 'utf-8')) as TRSession
  } catch {
    console.error('❌ No se encontró sesión. Ejecuta pnpm tr:auth primero.')
    process.exit(1)
  }

  const client = await connectTR(sessionData)
  console.log('✅ Conectado\n')

  // 1. Cash
  const cashArray = await client.subscribeOnce<TRCashItem[]>('cash')
  const cashItem = Array.isArray(cashArray) ? cashArray[0] : cashArray as unknown as TRCashItem
  console.log(`💰 Cash: ${cashItem?.amount?.toFixed(2)} EUR`)

  // 2. Account pairs → securities account number
  const accountPairs = await client.subscribeOnce<TRAccountPairsResponse>('accountPairs')
  const secAccNo = accountPairs.accounts?.[0]?.securitiesAccountNumber
  console.log(`🏦 Cuenta valores: ${secAccNo}`)

  // 3. Portfolio
  const portfolio = await client.subscribeOnce<TRPortfolioResponse>(
    'compactPortfolioByType',
    secAccNo ? { secAccNo } : undefined
  )
  const categories = portfolio.categories ?? []
  const totalPos = categories.reduce((s, c) => s + c.positions.length, 0)
  console.log(`\n📊 Posiciones (${totalPos} total):`)

  const allIsins: string[] = []
  for (const cat of categories) {
    console.log(`\n  [${cat.categoryType}]`)
    for (const pos of cat.positions) {
      console.log(`    ${pos.isin} | qty: ${pos.netSize} | ${pos.name}`)
      allIsins.push(pos.isin)
    }
  }

  // 4. Prices (first 3)
  if (allIsins.length > 0) {
    console.log('\n📈 Precios (primeros 3):')
    for (const isin of allIsins.slice(0, 3)) {
      const price = await fetchTickerPrice(client, isin)
      console.log(`    ${isin}: ${price !== null ? price + ' EUR' : 'no disponible'}`)
    }
  }

  // 5. Timeline — paginated to get full history
  console.log('\n📋 Obteniendo historial completo...')
  const items = await fetchAllTimeline(client)
  console.log(`📋 Total transacciones: ${items.length}`)
  console.log('Primeras 10:')
  for (const item of items.slice(0, 10)) {
    const date = new Date(item.timestamp).toLocaleDateString('es-ES')
    const amount = (item.amount?.value ?? 0).toFixed(2)
    const sign = (item.amount?.value ?? 0) >= 0 ? '+' : ''
    console.log(`    [${date}] title="${item.title}" subtitle="${item.subtitle ?? '-'}" | ${sign}${amount} EUR`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Checklist:')
  console.log(`  [${(cashItem?.amount ?? 0) > 0 ? '✓' : '✗'}] Cash: ${cashItem?.amount?.toFixed(2)} EUR`)
  console.log(`  [${allIsins.length > 0 ? '✓' : '✗'}] Posiciones: ${allIsins.length} ISINs`)
  console.log(`  [${items.length > 0 ? '✓' : '✗'}] Historial: ${items.length} items`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  client.close()
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
