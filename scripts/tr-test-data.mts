/**
 * Trade Republic — Data Test Script
 * Usage: pnpm tr:test
 */

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { connectTR, fetchTickerPrice, type TRSession } from './tr-client.mts'

// Actual TR response types (discovered from live API)
interface TRCashItem { accountNumber: string; currencyId: string; amount: number }
interface TRPortfolioPosition { isin: string; name: string; netSize: string; averageBuyIn: string }
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

  // 1. Cash — comes as array [{accountNumber, currencyId, amount}]
  const cashArray = await client.subscribeOnce<TRCashItem[]>('cash')
  const cashItem = Array.isArray(cashArray) ? cashArray[0] : cashArray as unknown as TRCashItem
  const accountNumber = cashItem?.accountNumber
  console.log(`💰 Cash: ${cashItem?.amount?.toFixed(2)} ${cashItem?.currencyId} (cuenta: ${accountNumber})`)

  // 2. Portfolio — requires secAccNo from cash response
  const portfolio = await client.subscribeOnce<TRPortfolioResponse>(
    'compactPortfolioByType',
    accountNumber ? { secAccNo: accountNumber } : undefined
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

  // 3. Prices (first 3)
  if (allIsins.length > 0) {
    console.log('\n📈 Precios (primeros 3):')
    for (const isin of allIsins.slice(0, 3)) {
      const price = await fetchTickerPrice(client, isin)
      console.log(`    ${isin}: ${price !== null ? price + ' EUR' : 'no disponible en LSX'}`)
    }
  }

  // 4. Timeline — try with secAccNo
  const timeline = await client.subscribeOnce<TRTimelineResponse>(
    'timelineTransactions',
    accountNumber ? { secAccNo: accountNumber } : undefined
  )
  const allItems = (timeline.sections ?? []).flatMap(s => s.data)
  console.log(`\n📋 Transacciones (${allItems.length} total, primeras 5):`)
  for (const item of allItems.slice(0, 5)) {
    const date = new Date(item.timestamp).toLocaleDateString('es-ES')
    console.log(`    [${date}] ${item.title} | ${item.cashChangeAmount?.toFixed(2) ?? '?'} EUR`)
  }

  client.close()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Checklist:')
  console.log(`  [${cashItem?.amount > 0 ? '✓' : '✗'}] Cash: ${cashItem?.amount?.toFixed(2)} EUR`)
  console.log(`  [${allIsins.length > 0 ? '✓' : '✗'}] Posiciones: ${allIsins.length} ISINs`)
  console.log(`  [${allItems.length > 0 ? '✓' : '✗'}] Transacciones: ${allItems.length}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
