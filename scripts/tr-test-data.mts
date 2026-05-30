/**
 * Trade Republic — Data Test Script
 * Usa el cliente WebSocket propio (no trapi) con sesión de cookies.
 * Usage: pnpm tr:test
 */

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { connectTR, fetchTickerPrice, type TRSession } from './tr-client.mts'

interface TRCashResponse { amount: number; currencyId: string }
interface TRPortfolioPosition { isin: string; name: string; netSize: string; averageBuyIn: string }
interface TRPortfolioCategory { categoryType: string; positions: TRPortfolioPosition[] }
interface TRPortfolioResponse { categories?: TRPortfolioCategory[] }

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')

type SessionData = TRSession

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

  console.log(`📂 Sesión cargada (${sessionData.rawCookies.length} cookies, token: ${sessionData.trSessionToken.slice(0, 15)}...)`)
  console.log('🔌 Conectando al WebSocket de TR...')

  const client = await connectTR(sessionData)
  console.log('✅ Conectado\n')

  // Test 1: Cash — log raw to discover actual structure
  const cashRaw = await client.subscribeOnce<unknown>('cash')
  console.log('💰 Cash (raw):', JSON.stringify(cashRaw, null, 2))
  const cash = cashRaw as TRCashResponse
  const cashAmount = cash.amount ?? (cashRaw as Record<string, unknown>)['cashAmount'] ?? (cashRaw as Record<string, unknown>)['value']
  console.log(`💰 Cash amount: ${typeof cashAmount === 'number' ? cashAmount.toFixed(2) : cashAmount} EUR`)

  // Test 2: Portfolio — log raw too
  const portfolioRaw = await client.subscribeOnce<unknown>('compactPortfolioByType')
  console.log('\n📊 Portfolio (raw first 500 chars):', JSON.stringify(portfolioRaw).slice(0, 500))
  const portfolio = portfolioRaw as TRPortfolioResponse
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
