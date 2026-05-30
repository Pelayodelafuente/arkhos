/**
 * Trade Republic — Browser Authentication Script
 *
 * Abre Chrome visible, detecta el login automáticamente via CDP y DOM,
 * y guarda la sesión para el sync automático.
 *
 * Usage:
 *   pnpm tr:auth
 */

import puppeteer from 'puppeteer'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')
const TR_APP_URL = 'https://app.traderepublic.com'

interface SavedCookieData {
  trSessionToken: string
  trRefreshToken?: string
  rawCookies: string[]
}

interface CDPCookie {
  name: string
  value: string
  domain: string
  path: string
  httpOnly: boolean
  secure: boolean
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Trade Republic — Auth Setup')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('Se abrirá Chrome. Loguéate en Trade Republic.')
  console.log('El script detectará el login automáticamente.')
  console.log('')

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--start-maximized'],
  })

  const page = await browser.newPage()

  // CDP session — can read HttpOnly cookies and all browser state
  const cdpClient = await page.createCDPSession()

  console.log('🌐 Abriendo Trade Republic...')
  await page.goto(TR_APP_URL, { waitUntil: 'domcontentloaded' })

  console.log('👆 Loguéate en la ventana de Chrome.')
  console.log('   Esperando detección automática...')

  // Wait up to 5 minutes for login detection
  const MAX_WAIT_MS = 5 * 60 * 1000
  const POLL_INTERVAL_MS = 3_000
  const start = Date.now()

  let allCookies: CDPCookie[] = []
  let detected = false

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    try {
      // 1. Get ALL cookies via CDP (includes HttpOnly)
      const result = await cdpClient.send('Network.getAllCookies') as { cookies: CDPCookie[] }
      allCookies = result.cookies.filter((c) => c.domain.includes('traderepublic'))

      // Check if we have a session token
      const sessionCookie = allCookies.find(
        (c) => c.name === 'tr_session' || c.name.toLowerCase().includes('session')
      )

      // 2. Check URL — after login, TR redirects away from login flow
      const currentUrl = page.url()
      const isLoggedIn = !currentUrl.includes('/login') && !currentUrl.includes('/register')
        && currentUrl !== TR_APP_URL + '/'
        && currentUrl !== TR_APP_URL

      // 3. Check DOM — portfolio only renders when authenticated
      let hasDashboard = false
      try {
        hasDashboard = await page.evaluate(() => {
          return document.querySelector('[data-testid="portfolio"]') !== null
            || document.querySelector('.portfolioInstrumentList') !== null
            || document.querySelector('tr-instrument-list') !== null
            || document.querySelector('[class*="portfolio"]') !== null
            || document.title.toLowerCase().includes('portfolio')
            || document.title.toLowerCase().includes('cartera')
        })
      } catch { /* page might be navigating */ }

      const elapsed = Math.round((Date.now() - start) / 1000)
      process.stdout.write(`\r   [${elapsed}s] cookies TR: ${allCookies.length} | URL: ${currentUrl.replace(TR_APP_URL, '')} | dashboard: ${hasDashboard}`)

      if (sessionCookie || (allCookies.length >= 2 && (isLoggedIn || hasDashboard))) {
        detected = true
        console.log('\n✅ Login detectado!')
        break
      }
    } catch (err) {
      // CDP might fail briefly during navigation
    }
  }

  if (!detected && allCookies.length === 0) {
    // Last attempt — dump everything for diagnosis
    try {
      const result = await cdpClient.send('Network.getAllCookies') as { cookies: CDPCookie[] }
      allCookies = result.cookies

      console.log('\n⚠️  No se detectó sesión. Cookies disponibles:')
      for (const c of allCookies.slice(0, 20)) {
        console.log(`   ${c.domain} | ${c.name} = ${c.value.slice(0, 30)}`)
      }
    } catch { /* ignore */ }
  }

  await browser.close()

  if (allCookies.length === 0) {
    console.error('\n❌ No se encontraron cookies de Trade Republic.')
    console.error('   Asegúrate de completar el login antes de que cierre Chrome.')
    process.exit(1)
  }

  // Find session token
  const sessionCookie = allCookies.find((c) =>
    c.name === 'tr_session' ||
    c.name === 'session' ||
    c.name.toLowerCase().includes('session')
  )
  const refreshCookie = allCookies.find((c) =>
    c.name.toLowerCase().includes('refresh')
  )

  const sessionToken = sessionCookie?.value ?? allCookies[0]?.value ?? ''

  if (!sessionToken) {
    console.error('\n❌ No se pudo extraer el token de sesión.')
    console.log('   Cookies TR encontradas:')
    for (const c of allCookies) {
      console.log(`   ${c.name} = ${c.value.slice(0, 40)}`)
    }
    process.exit(1)
  }

  // Build rawCookies in Set-Cookie format
  const rawCookies = allCookies.map(
    (c) => `${c.name}=${c.value}; Path=${c.path}; Domain=${c.domain}`
  )

  const sessionData: SavedCookieData = {
    trSessionToken: sessionToken,
    ...(refreshCookie && { trRefreshToken: refreshCookie.value }),
    rawCookies,
  }

  await fs.writeFile(SESSION_FILE, JSON.stringify(sessionData, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  })

  console.log(`\n✅ Sesión guardada en ${SESSION_FILE}`)
  console.log(`   Token usado: ${sessionCookie?.name ?? allCookies[0]?.name} = ${sessionToken.slice(0, 25)}...`)
  console.log(`   Total cookies TR: ${allCookies.length}`)
  console.log('')

  const sessionContent = await fs.readFile(SESSION_FILE, 'utf-8')
  const sessionB64 = Buffer.from(sessionContent).toString('base64')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Secret para GitHub Actions:')
  console.log('  github.com/Pelayodelafuente/arkhos')
  console.log('  → Settings → Secrets → Actions')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nSecret name:  TR_COOKIE_FILE_B64')
  console.log('Secret value:')
  console.log(sessionB64)
  console.log('')
  console.log('Otros secrets necesarios:')
  console.log('  TR_USER_ID              = [UUID en Supabase: Auth → Users]')
  console.log('  NEXT_PUBLIC_SUPABASE_URL = [de .env.local]')
  console.log('  SUPABASE_SERVICE_ROLE_KEY = [de .env.local]')
  console.log('\nSiguiente paso: pnpm tr:test')
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
