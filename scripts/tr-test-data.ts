/**
 * Trade Republic — Data Test Script
 *
 * Verifica que la sesión funciona y muestra los datos que se sincronizarán.
 * Ejecutar DESPUÉS de tr-auth.ts.
 *
 * Usage:
 *   npx tsx scripts/tr-test-data.ts
 */

import { TradeRepublicApi, createMessage } from 'trapi'
import type { Portfolio, Category } from 'trapi'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
try {
  const envContent = await fs.readFile(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key?.trim() && !key.startsWith('#')) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  }
} catch { /* ignore */ }

const phone = process.env.TR_PHONE!
const pin = process.env.TR_PIN!

if (!phone || !pin) {
  console.error('❌ TR_PHONE y TR_PIN requeridos en .env.local')
  process.exit(1)
}

function subscribeOnce<T>(api: TradeRepublicApi, type: Parameters<typeof createMessage>[0], data?: Record<string, unknown>): Promise<T> {
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

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Trade Republic — Test de Datos')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const api = new TradeRepublicApi(phone, pin)

console.log('🔐 Conectando (usando sesión guardada)...')
const loginOk = await api.login()

if (!loginOk) {
  console.error('❌ Login fallido — ejecuta tr-auth.ts primero')
  process.exit(1)
}

console.log('✅ Sesión válida\n')

// Test 1: Cash
const cash = await subscribeOnce<{ amount: number; currencyId: string }>(api, 'cash')
console.log(`💰 Cash: ${cash.amount.toFixed(2)} ${cash.currencyId}`)

// Test 2: Portfolio
const portfolio = await subscribeOnce<Portfolio>(api, 'compactPortfolioByType')
const categories = portfolio.categories ?? []
console.log(`\n📊 Posiciones (${categories.reduce((sum, c) => sum + c.positions.length, 0)} total):`)

const allIsins: string[] = []
for (const category of categories) {
  console.log(`\n  [${category.categoryType.toUpperCase()}]`)
  for (const pos of category.positions) {
    console.log(`    ISIN: ${pos.isin} | Qty: ${pos.netSize} | AvgBuy: ${pos.averageBuyIn} | ${pos.name}`)
    allIsins.push(pos.isin)
  }
}

// Test 3: Ticker price for first 3 ISINs
console.log('\n📈 Precios actuales (primeros 3):')
const sampleIsins = allIsins.slice(0, 3)
for (const isin of sampleIsins) {
  try {
    const ticker = await subscribeOnce<{ last?: { price: string } }>(api, 'ticker', { id: `${isin}.LSX` })
    console.log(`    ${isin}: ${ticker.last?.price ?? 'N/A'} EUR`)
  } catch {
    console.log(`    ${isin}: no disponible (prueba con otro exchange ID)`)
  }
}

// Test 4: Timeline transactions (first 5)
const timeline = await subscribeOnce<{ sections?: Array<{ title: string; data: Array<{ id: string; title: string; timestamp: number; cashChangeAmount?: number }> }> }>(api, 'timelineTransactions')
const allItems = (timeline.sections ?? []).flatMap((s) => s.data)
console.log(`\n📋 Transacciones (${allItems.length} total, primeras 5):`)
for (const item of allItems.slice(0, 5)) {
  const date = new Date(item.timestamp).toLocaleDateString('es-ES')
  console.log(`    [${date}] ${item.title} | ${item.cashChangeAmount?.toFixed(2) ?? '?'} EUR`)
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Checklist de validación:')
console.log(`  [${cash.amount > 0 ? '✓' : '✗'}] Cash recibido`)
console.log(`  [${allIsins.length > 0 ? '✓' : '✗'}] Posiciones recibidas (${allIsins.length} ISINs)`)
console.log(`  [${allItems.length > 0 ? '✓' : '✗'}] Transacciones recibidas (${allItems.length})`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

process.exit(0)
