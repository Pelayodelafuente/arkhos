/**
 * Trade Republic — Data Test Script
 * Usa el cliente WebSocket propio (no trapi) con sesión de cookies.
 * Usage: pnpm tr:test
 */

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { connectTR, fetchTickerPrice } from '../src/lib/tr/websocket.js'
import type { TRPortfolioResponse, TRCashResponse } from '../src/lib/tr/types.js'

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')

interface SessionData {
  rawCookies: string[]
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Trade Republic — Test de Datos')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  let sessionData: SessionData
  try {
    const content = await fs.readFile(SESSION_FILE, 'utf-8')
    sessionData = JSON.parse(content) as SessionData
  } catch {
    console.error('❌ No se encontró sesión. Ejecuta pnpm tr:auth primero.')
    process.exit(1)
  }

  console.log(`📂 Sesión cargada (${sessionData.rawCookies.length} cookies)`)
  console.log('🔌 Conectando al WebSocket de TR...')

  const client = await connectTR(sessionData.rawCookies)
  console.log('✅ Conectado\n')

  // Test 1: Cash
  const cash = await client.subscribeOnce<TRCashResponse>('cash')
  console.log(`💰 Cash: ${cash.amount.toFixed(2)} ${cash.currencyId}`)

  // Test 2: Portfolio
  const portfolio = await client.subscribeOnce<TRPortfolioResponse>('compactPortfolioByType')
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

  // Test 3: Prices (first 3 ISINs)
  if (allIsins.length > 0) {
    console.log('\n📈 Precios (primeros 3):')
    for (const isin of allIsins.slice(0, 3)) {
      const price = await fetchTickerPrice(client, isin)
      console.log(`    ${isin}: ${price !== null ? price + ' EUR' : 'no disponible'}`)
    }
  }

  // Test 4: Timeline
  const timelineRaw = await client.subscribeOnce<{ sections?: Array<{ data: Array<{ id: string; title: string; timestamp: number; cashChangeAmount?: number }> }> }>('timelineTransactions')
  const allItems = (timelineRaw.sections ?? []).flatMap(s => s.data)
  console.log(`\n📋 Transacciones (${allItems.length} total, primeras 5):`)
  for (const item of allItems.slice(0, 5)) {
    const date = new Date(item.timestamp).toLocaleDateString('es-ES')
    console.log(`    [${date}] ${item.title} | ${item.cashChangeAmount?.toFixed(2) ?? '?'} EUR`)
  }

  client.close()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Checklist:')
  console.log(`  [${cash.amount > 0 ? '✓' : '✗'}] Cash recibido (${cash.amount.toFixed(2)} EUR)`)
  console.log(`  [${allIsins.length > 0 ? '✓' : '✗'}] Posiciones (${allIsins.length} ISINs)`)
  console.log(`  [${allItems.length > 0 ? '✓' : '✗'}] Transacciones (${allItems.length})`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
