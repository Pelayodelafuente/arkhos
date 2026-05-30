/**
 * Trade Republic — Browser Authentication Script
 *
 * Abre Chrome visible, el usuario se loguea manualmente en la web de TR,
 * el script extrae la sesión automáticamente y la guarda para el sync.
 *
 * Usage:
 *   pnpm tr:auth
 *
 * No se requieren credenciales en .env.local para este script.
 */

import puppeteer from 'puppeteer'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import * as readline from 'node:readline/promises'

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')
const TR_APP_URL = 'https://app.traderepublic.com'
const TR_API_HOST = 'api.traderepublic.com'

interface SavedCookieData {
  trSessionToken: string
  trRefreshToken?: string
  rawCookies: string[]
}

async function waitForEnter(prompt: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  await rl.question(prompt)
  rl.close()
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Trade Republic — Auth Setup')
  console.log('  (modo navegador visible)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('Se abrirá Chrome. Inicia sesión en Trade Republic.')
  console.log('Cuando estés dentro del dashboard, pulsa ENTER aquí.')
  console.log('')

  // Launch visible Chrome (headless: false)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--start-maximized'],
  })

  const page = await browser.newPage()

  // Intercept cookies from API responses
  const capturedCookieHeaders: string[] = []
  let capturedSessionToken: string | null = null

  await page.setRequestInterception(true)

  page.on('request', (req) => {
    req.continue()
  })

  page.on('response', async (response) => {
    const url = response.url()
    if (!url.includes(TR_API_HOST)) return

    try {
      const headers = response.headers()
      const setCookie = headers['set-cookie']
      if (setCookie) {
        const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
        for (const c of cookies) {
          capturedCookieHeaders.push(c)
          const match = /tr_session=([^;]+)/.exec(c)
          if (match) capturedSessionToken = match[1]
        }
      }
    } catch {
      // ignore errors reading response headers
    }
  })

  console.log('🌐 Abriendo Trade Republic...')
  await page.goto(TR_APP_URL, { waitUntil: 'domcontentloaded' })

  console.log('')
  console.log('👆 Inicia sesión en la ventana de Chrome que se ha abierto.')
  console.log('   Cuando veas el dashboard (tus posiciones), pulsa ENTER aquí.')
  console.log('')

  await waitForEnter('Pulsa ENTER cuando hayas iniciado sesión: ')

  // Also read cookies via Puppeteer API as fallback
  const pageCookies = await page.cookies()
  const trSessionCookie = pageCookies.find((c) => c.name === 'tr_session')
  const trRefreshCookie = pageCookies.find(
    (c) => c.name === 'tr_session_refresh' || c.name === 'tr_refresh'
  )

  if (trSessionCookie && !capturedSessionToken) {
    capturedSessionToken = trSessionCookie.value
  }

  if (capturedCookieHeaders.length === 0) {
    for (const cookie of pageCookies) {
      if (cookie.domain.includes('traderepublic')) {
        capturedCookieHeaders.push(
          `${cookie.name}=${cookie.value}; Path=${cookie.path}; Domain=${cookie.domain}`
        )
      }
    }
  }

  await browser.close()

  if (!capturedSessionToken) {
    console.error('')
    console.error('❌ No se encontró el token tr_session.')
    console.error('   Asegúrate de haber completado el login antes de pulsar ENTER.')
    process.exit(1)
  }

  const sessionData: SavedCookieData = {
    trSessionToken: capturedSessionToken,
    ...(trRefreshCookie && { trRefreshToken: trRefreshCookie.value }),
    rawCookies: capturedCookieHeaders,
  }

  await fs.writeFile(SESSION_FILE, JSON.stringify(sessionData, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  })

  console.log('')
  console.log(`✅ Sesión guardada en ${SESSION_FILE}`)
  console.log(`   tr_session: ${capturedSessionToken.slice(0, 20)}...`)
  console.log('')

  const sessionContent = await fs.readFile(SESSION_FILE, 'utf-8')
  const sessionB64 = Buffer.from(sessionContent).toString('base64')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Copia este valor a GitHub Secrets:')
  console.log('  github.com/Pelayodelafuente/arkhos')
  console.log('  → Settings → Secrets → Actions')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('Secret name:  TR_COOKIE_FILE_B64')
  console.log('Secret value:')
  console.log(sessionB64)
  console.log('')
  console.log('Otros secrets necesarios (si no los tienes ya):')
  console.log('  TR_USER_ID              = [UUID en Supabase Auth → Users]')
  console.log('  NEXT_PUBLIC_SUPABASE_URL = [de .env.local]')
  console.log('  SUPABASE_SERVICE_ROLE_KEY = [de .env.local]')
  console.log('')
  console.log('Siguiente paso: pnpm tr:test')
}

main().catch((err: unknown) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
