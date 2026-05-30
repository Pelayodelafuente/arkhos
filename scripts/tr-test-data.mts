/**
 * Trade Republic — Data Test Script
 * Usage: pnpm tr:test (ejecutar en tu terminal, no con !)
 */

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { connectTR, fetchTickerPrice, type TRSession } from './tr-client.mts'

// Actual TR WebSocket response types (verified from live API)
interface TRCashItem { accountNumber: string; currencyId: string; amount: number }
interface TRAccountPair {
  securitiesAccountNumber: string
  cashAccountNumber: string
  productType: string
  currency: string
}
interface TRAccountPairsResponse {
  authAccountId: string
  accounts: TRAccountPair[]
}
interface TRPortfolioPosition {
  isin: string; name: string; netSize: string; averageBuyIn: string
}
interface TRPortfolioCategory { categoryType: string; positions: TRPortfolioPosition[] }
interface TRPortfolioResponse { categories?: TRPortfolioCategory[] }
interface TRTimelineItem { id: string; title: string; timestamp: number; cashChangeAmount?: number }
interface TRTimelineSection { title: string; data: TRTimelineItem[] }
interface TRTimelineResponse { sections?: TRTimelineSection[] }

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

  console.log(`📂 Sesión cargada (${sessionData.rawCookies.length} cookies)`)
  console.log('🔌 Conectando...')

  const client = await connectTR(sessionData)
  console.log('✅ Conectado\n')

  // 1. Cash (array response)
  const cashArray = await client.subscribeOnce<TRCashItem[]>('cash')
  const cashItem = Array.isArray(cashArray) ? cashArray[0] : cashArray as unknown as TRCashItem
  console.log(`💰 Cash: ${cashItem?.amount?.toFixed(2)} ${cashItem?.currencyId}`)

  // 2. Account pairs → get securities account number
  const accountPairs = await client.subscribeOnce<TRAccountPairsResponse>('accountPairs')
  const secAccount = accountPairs.accounts?.[0]?.securitiesAccountNumber
  console.log(`🏦 Cuenta valores: ${secAccount} | Cuenta efectivo: ${cashItem?.accountNumber}`)

  // 3. Portfolio — use securities account number
  const portfolio = await client.subscribeOnce<TRPortfolioResponse>(
    'compactPortfolioByType',
    secAccount ? { secAccNo: secAccount } : undefined
  )
  const categories = portfolio.categories ?? []
  const totalPos = categories.reduce((s, c) => s + c.positions.length, 0)
  console.log(`\n📊 Posiciones (${totalPos} total):`)

  const allIsins: string[] = []
  for (const cat of categories) {
    console.log(`\n  [${cat.categoryType.toUpperCase()}]`)
    for (const pos of cat.positions) {
      console.log(`    ${pos.isin} | qty: ${pos.netSize} | avgBuy: ${pos.averageBuyIn} | ${pos.name}`)
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

  // 5. Timeline — try multiple approaches to find correct params
  const timelineRaw = await client.subscribeOnce<unknown>('timelineTransactions')
  console.log('\n📋 Timeline raw (sin secAccNo):', JSON.stringify(timelineRaw).slice(0, 400))

  const timelineWithAcc = await client.subscribeOnce<unknown>(
    'timelineTransactions',
    { secAccNo: secAccount }
  )
  console.log('📋 Timeline raw (con secAccNo):', JSON.stringify(timelineWithAcc).slice(0, 400))

  const timeline = (timelineRaw as TRTimelineResponse).sections?.length
    ? timelineRaw as TRTimelineResponse
    : timelineWithAcc as TRTimelineResponse
  const allItems = (timeline.sections ?? []).flatMap(s => s.data)
  console.log(`\n📋 Transacciones (${allItems.length} total, primeras 5):`)
  for (const item of allItems.slice(0, 5)) {
    const date = new Date(item.timestamp).toLocaleDateString('es-ES')
    console.log(`    [${date}] ${item.title} | ${item.cashChangeAmount?.toFixed(2) ?? '?'} EUR`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Checklist:')
  console.log(`  [${(cashItem?.amount ?? 0) > 0 ? '✓' : '✗'}] Cash: ${cashItem?.amount?.toFixed(2)} EUR`)
  console.log(`  [${allIsins.length > 0 ? '✓' : '✗'}] Posiciones: ${allIsins.length} ISINs`)
  console.log(`  [${allItems.length > 0 ? '✓' : '✗'}] Transacciones: ${allItems.length}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  client.close()
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
