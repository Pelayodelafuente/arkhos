/**
 * Trade Republic — Browser Authentication Script
 *
 * Abre Chrome, espera 90 segundos para que te logues,
 * luego lee todas las cookies y guarda la sesión.
 *
 * IMPORTANTE: ejecutar directamente en tu terminal (no con !):
 *   pnpm tr:auth
 */

import puppeteer from 'puppeteer'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')
const TR_APP_URL = 'https://app.traderepublic.com'
const WAIT_SECONDS = 90

interface SavedCookieData {
  trSessionToken: string
  trRefreshToken?: string
  rawCookies: string[]
}

interface CDPCookie {
  name: string; value: string; domain: string; path: string
  httpOnly: boolean; secure: boolean
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Trade Republic — Auth Setup')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n⏱️  Tienes ${WAIT_SECONDS} segundos para loguearte en la ventana de Chrome.\n`)

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--start-maximized'],
  })

  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.enable')

  console.log('🌐 Abriendo Trade Republic...')
  await page.goto(TR_APP_URL, { waitUntil: 'domcontentloaded' })
  console.log('👆 Loguéate en la ventana de Chrome. Cerrará automáticamente.\n')

  // Countdown
  for (let i = WAIT_SECONDS; i > 0; i--) {
    process.stdout.write(`\r   ⏳ ${i}s restantes...   `)
    await new Promise(r => setTimeout(r, 1_000))

    // Early exit if tr_session detected
    if (i % 5 === 0) {
      try {
        const { cookies } = await cdp.send('Network.getAllCookies') as { cookies: CDPCookie[] }
        const trSession = cookies.find(c => c.name === 'tr_session')
        if (trSession) {
          console.log('\n✅ tr_session detectado, guardando sesión...')
          await saveSession(cdp, browser)
          return
        }
      } catch { /* ignore */ }
    }
  }

  console.log('\n⏰ Tiempo agotado, leyendo cookies...')
  await saveSession(cdp, browser)
}

async function saveSession(cdp: Awaited<ReturnType<typeof import('puppeteer').default.prototype.newPage.prototype.createCDPSession>>, browser: import('puppeteer').Browser) {
  const { cookies: allCookies } = await cdp.send('Network.getAllCookies') as { cookies: CDPCookie[] }
  const trCookies = allCookies.filter(c => c.domain.includes('traderepublic'))

  await browser.close()

  console.log(`\n🍪 Cookies TR encontradas: ${trCookies.length}`)
  trCookies.forEach(c => console.log(`   ${c.name} (${c.domain})`))

  if (trCookies.length === 0) {
    console.error('\n❌ No se encontraron cookies de traderepublic.com')
    console.error('   Asegúrate de completar el login en el tiempo disponible.')
    process.exit(1)
  }

  const trSessionCookie = trCookies.find(c => c.name === 'tr_session')
  const trRefreshCookie = trCookies.find(c => c.name === 'tr_refresh')
  const fallback = trCookies.find(c => c.name === 'JSESSIONID') ?? trCookies[0]

  const sessionToken = trSessionCookie?.value ?? fallback?.value ?? ''
  if (!sessionToken) {
    console.error('❌ No se encontró ningún token de sesión.')
    process.exit(1)
  }

  const rawCookies = trCookies.map(
    c => `${c.name}=${c.value}; Path=${c.path}; Domain=${c.domain}`
  )

  const sessionData: SavedCookieData = {
    trSessionToken: sessionToken,
    ...(trRefreshCookie && { trRefreshToken: trRefreshCookie.value }),
    rawCookies,
  }

  await fs.writeFile(SESSION_FILE, JSON.stringify(sessionData, null, 2), {
    encoding: 'utf-8', mode: 0o600,
  })

  const b64 = Buffer.from(JSON.stringify(sessionData, null, 2)).toString('base64')

  console.log(`\n✅ Sesión guardada en ${SESSION_FILE}`)
  console.log(`   Token: ${sessionToken.slice(0, 20)}... (${trSessionCookie ? 'JWT' : 'fallback'})`)
  console.log(`   Cookies: ${rawCookies.length}`)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Secret name:  TR_COOKIE_FILE_B64')
  console.log('Secret value:')
  console.log(b64)
  console.log('\nSiguiente paso: pnpm tr:test')
}

main().catch((err: unknown) => { console.error('Error:', err); process.exit(1) })
