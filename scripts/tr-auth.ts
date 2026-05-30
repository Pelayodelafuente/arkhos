/**
 * Trade Republic — Interactive Authentication Script
 *
 * Run once from your local machine to obtain a session file.
 * The session JSON must then be stored as a GitHub Secret (base64 encoded).
 *
 * Usage:
 *   npx tsx scripts/tr-auth.ts
 *
 * Prerequisites:
 *   TR_PHONE=+34XXXXXXXXX  in .env.local
 *   TR_PIN=XXXX            in .env.local
 */

import { TradeRepublicApi, createMessage } from 'trapi'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import * as readline from 'node:readline/promises'

// Load .env.local manually (scripts run outside Next.js)
const envPath = path.join(process.cwd(), '.env.local')
try {
  const envContent = await fs.readFile(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key?.trim() && !key.startsWith('#')) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  }
} catch {
  // .env.local not found — rely on env vars already set
}

const phone = process.env.TR_PHONE
const pin = process.env.TR_PIN

if (!phone || !pin) {
  console.error('❌ TR_PHONE y TR_PIN deben estar en .env.local')
  process.exit(1)
}

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Trade Republic — Auth Setup')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`📱 Teléfono: ${phone}`)
console.log(`📂 Sesión: ${SESSION_FILE}`)
console.log('')

const api = new TradeRepublicApi(phone, pin)

console.log('🔐 Iniciando login... (enviaremos un SMS con el OTP)')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const success = await api.login(async () => {
  const otp = await rl.question('🔢 Introduce el OTP recibido por SMS: ')
  rl.close()
  return otp.trim()
})

if (!success) {
  console.error('❌ Login fallido. Verifica phone, PIN y OTP.')
  process.exit(1)
}

console.log('✅ Login correcto')
console.log('')

// Quick test — subscribe to cash to verify session works
console.log('🧪 Verificando sesión con datos reales...')

const cashData = await new Promise<string | null>((resolve) => {
  const timeout = setTimeout(() => resolve(null), 10_000)
  api.subscribeOnce(createMessage('cash'), (data) => {
    clearTimeout(timeout)
    resolve(data)
  })
})

if (cashData) {
  const parsed = JSON.parse(cashData) as { amount?: number; currencyId?: string }
  console.log(`💰 Saldo en cuenta: ${parsed.amount?.toFixed(2)} ${parsed.currencyId ?? 'EUR'}`)
} else {
  console.warn('⚠️  No se recibió respuesta del canal cash (el token puede ser válido igualmente)')
}

// Read the session file and output base64 for GitHub Secrets
try {
  const sessionContent = await fs.readFile(SESSION_FILE, 'utf-8')
  const sessionB64 = Buffer.from(sessionContent).toString('base64')

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Copia estos valores a GitHub Secrets')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('Secret: TR_COOKIE_FILE_B64')
  console.log('Valor:')
  console.log(sessionB64)
  console.log('')
  console.log('Ruta: github.com/Pelayodelafuente/arkhos → Settings → Secrets → Actions')
  console.log('')
  console.log('📌 También añade en el mismo lugar:')
  console.log('  TR_PHONE =', phone)
  console.log('  TR_PIN   =', pin)
  console.log('  TR_USER_ID = [tu UUID de Supabase auth.users]')
  console.log('  NEXT_PUBLIC_SUPABASE_URL = [de .env.local]')
  console.log('  SUPABASE_SERVICE_ROLE_KEY = [de .env.local]')
} catch {
  console.warn('⚠️  No se encontró el archivo de sesión en', SESSION_FILE)
  console.warn('El SDK puede haber guardado la sesión en otra ubicación.')
}

process.exit(0)
