/**
 * Trade Republic — Browser Authentication Script
 *
 * Abre Chrome visible, el usuario se loguea manualmente en la web de TR,
 * el script detecta el login automáticamente y guarda la sesión.
 *
 * Usage:
 *   pnpm tr:auth
 *
 * No requiere credenciales — el usuario se loguea en la ventana de Chrome.
 */

import puppeteer from 'puppeteer'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')
const TR_APP_URL = 'https://app.traderepublic.com'
const TR_API_HOST = 'api.traderepublic.com'

interface SavedCookieData {
  trSessionToken: string
  trRefreshToken?: string
  rawCookies: string[]
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Trade Republic — Auth Setup')
  console.log('  (modo navegador visible)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('Se abrirá Chrome. Inicia sesión en Trade Republic.')
  console.log('El script detectará el login automáticamente.')
  console.log('')

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--start-maximized'],
  })

  const page = await browser.newPage()

  // Collect cookies from API responses
  const capturedCookieHeaders: string[] = []
  let capturedSessionToken: string | null = null

  await page.setRequestInterception(true)
  page.on('request', (req) => { req.continue() })

  page.on('response', async (response) => {
    if (!response.url().includes(TR_API_HOST)) return
    try {
      const headers = response.headers()
      const setCookie = headers['set-cookie']
      if (setCookie) {
        const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
        for (const c of cookies) {
          if (!capturedCookieHeaders.includes(c)) capturedCookieHeaders.push(c)
          const match = /tr_session=([^;]+)/.exec(c)
          if (match) capturedSessionToken = match[1]
        }
      }
    } catch { /* ignore */ }
  })

  console.log('🌐 Abriendo Trade Republic...')
  await page.goto(TR_APP_URL, { waitUntil: 'domcontentloaded' })

  console.log('👆 Loguéate en la ventana de Chrome.')
  console.log('   Esperando detección automática del login...')
  console.log('')

  // Wait for tr_session cookie to appear (indicates successful login)
  // Polls every 2 seconds, timeout 5 minutes
  const MAX_WAIT_MS = 5 * 60 * 1000
  const POLL_INTERVAL_MS = 2_000
  const start = Date.now()

  while (Date.now() - start < MAX_WAIT_MS) {
    const cookies = await page.cookies()
    const trSession = cookies.find((c) => c.name === 'tr_session')

    if (trSession) {
      capturedSessionToken = trSession.value
      console.log('✅ Login detectado!')
      break
    }

    // Also check localStorage as fallback
    try {
      const localStorageToken = await page.evaluate(() => {
        return (
          localStorage.getItem('tr_session') ??
          localStorage.getItem('session') ??
          localStorage.getItem('accessToken') ??
          null
        )
      })
      if (localStorageToken) {
        capturedSessionToken = localStorageToken
        console.log('✅ Login detectado (localStorage)!')
        break
      }
    } catch { /* page might not be ready */ }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  if (!capturedSessionToken) {
    // Last resort: collect any cookies even without tr_session
    const allCookies = await page.cookies()
    const trRelated = allCookies.filter((c) => c.domain.includes('traderepublic'))

    if (trRelated.length > 0) {
      console.log(`⚠️  No se encontró tr_session pero hay ${trRelated.length} cookies de TR.`)
      console.log('   Cookies encontradas:', trRelated.map((c) => c.name).join(', '))
      // Use any token-like cookie as session token
      const anyToken = trRelated.find((c) => c.name.includes('session') || c.name.includes('token'))
      if (anyToken) capturedSessionToken = anyToken.value
    }
  }

  // Build rawCookies array
  const pageCookies = await page.cookies()
  const trRefreshCookie = pageCookies.find(
    (c) => c.name === 'tr_session_refresh' || c.name === 'tr_refresh'
  )

  if (capturedCookieHeaders.length === 0) {
    for (const cookie of pageCookies) {
      if (cookie.domain.includes('traderepublic')) {
        capturedCookieHeaders.push(
          `${cookie.name}=${cookie.value}; Path=${cookie.path ?? '/'}; Domain=${cookie.domain}`
        )
      }
    }
  }

  await browser.close()

  if (!capturedSessionToken) {
    console.error('')
    console.error('❌ No se pudo capturar el token de sesión.')
    console.error('   ¿Completaste el login en la ventana de Chrome?')
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
  console.log('Otros secrets necesarios:')
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
