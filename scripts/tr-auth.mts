/**
 * Trade Republic — Interactive Authentication Script
 *
 * Run once from your local machine to obtain a session file.
 * The session JSON must then be stored as a GitHub Secret (base64 encoded).
 *
 * Usage:
 *   pnpm tr:auth
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

async function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  try {
    const content = await fs.readFile(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const eqIdx = line.indexOf('=')
      if (eqIdx === -1 || line.trim().startsWith('#')) continue
      const key = line.slice(0, eqIdx).trim()
      const value = line.slice(eqIdx + 1).trim()
      if (key) process.env[key] = value
    }
  } catch {
    // .env.local not found — rely on vars already in environment
  }
}

async function main() {
  await loadEnv()

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
  console.log(`📂 Sesión:   ${SESSION_FILE}`)
  console.log('')

  const api = new TradeRepublicApi(phone, pin)

  console.log('🔐 Iniciando login... (enviaremos un SMS con el OTP)')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const success = await api.login(async () => {
    const otp = await rl.question('🔢 Introduce el OTP recibido por SMS: ')
    rl.close()
    return otp.trim()
  })

  if (!success) {
    console.error('❌ Login fallido. Verifica teléfono, PIN y OTP.')
    process.exit(1)
  }

  console.log('✅ Login correcto')
  console.log('')

  // Quick verification — subscribe to cash
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
    console.warn('⚠️  No se recibió respuesta del canal cash')
  }

  // Read session file and output base64
  try {
    const sessionContent = await fs.readFile(SESSION_FILE, 'utf-8')
    const sessionB64 = Buffer.from(sessionContent).toString('base64')

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  Copia estos valores a GitHub Secrets')
    console.log('  github.com/Pelayodelafuente/arkhos')
    console.log('  → Settings → Secrets → Actions')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('Secret name:  TR_COOKIE_FILE_B64')
    console.log('Secret value:')
    console.log(sessionB64)
    console.log('')
    console.log('Otros secrets necesarios:')
    console.log(`  TR_PHONE               = ${phone}`)
    console.log(`  TR_PIN                 = ${pin}`)
    console.log('  TR_USER_ID             = [UUID de tu usuario en Supabase Auth → Users]')
    console.log('  NEXT_PUBLIC_SUPABASE_URL = [de .env.local]')
    console.log('  SUPABASE_SERVICE_ROLE_KEY = [de .env.local]')
  } catch {
    console.warn('⚠️  No se encontró el archivo de sesión en', SESSION_FILE)
  }
}

main().catch((err: unknown) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
