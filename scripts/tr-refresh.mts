/**
 * Trade Republic — Token Refresh Script
 *
 * Renueva el JWT sin OTP cargando las cookies existentes en Puppeteer.
 * Requiere que el archivo de sesión exista (creado por tr-auth).
 * Si las cookies son válidas, TR renueva el JWT automáticamente.
 *
 * Usage:
 *   pnpm tr:refresh
 *
 * Ejecutar cuando el sync falla por sesión expirada.
 * Si este script también falla → ejecutar pnpm tr:auth (login completo).
 */

import puppeteer from 'puppeteer'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

const SESSION_FILE = path.join(os.homedir(), '.tr_api_cookies.json')
const TR_APP_URL = 'https://app.traderepublic.com'

interface SessionData {
  trSessionToken: string
  trRefreshToken?: string
  rawCookies: string[]
}

interface CDPCookie {
  name: string; value: string; domain: string; path: string
  httpOnly: boolean; secure: boolean; sameSite?: string; expires?: number
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Trade Republic — Token Refresh')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  let session: SessionData
  try {
    session = JSON.parse(await fs.readFile(SESSION_FILE, 'utf-8')) as SessionData
    console.log(`📂 Sesión existente: ${session.rawCookies.length} cookies`)
  } catch {
    console.error('❌ No hay archivo de sesión. Ejecuta pnpm tr:auth primero.')
    process.exit(1)
  }

  console.log('🌐 Cargando TR con cookies existentes (sin OTP)...')

  const browser = await puppeteer.launch({
    headless: true, // headless funciona para refresh (WAF acepta cookies válidas)
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.enable')

  // Load existing cookies into browser BEFORE navigating
  const cookiesToSet = session.rawCookies
    .map(raw => {
      const parts = raw.split(';').map(p => p.trim())
      const [nameVal, ...attrs] = parts
      const eqIdx = nameVal.indexOf('=')
      if (eqIdx === -1) return null
      const name = nameVal.slice(0, eqIdx)
      const value = nameVal.slice(eqIdx + 1)

      let domain = '.traderepublic.com'
      let cookiePath = '/'

      for (const attr of attrs) {
        const [k, v] = attr.split('=').map(s => s.trim())
        if (k.toLowerCase() === 'domain' && v) domain = v
        if (k.toLowerCase() === 'path' && v) cookiePath = v
      }

      return { name, value, domain, path: cookiePath, url: TR_APP_URL }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  await cdp.send('Network.setCookies', { cookies: cookiesToSet })
  console.log(`🍪 ${cookiesToSet.length} cookies inyectadas en el browser`)

  let newToken: string | null = null

  // Watch for new tr_session in response headers
  page.on('response', async (response) => {
    if (!response.url().includes('traderepublic')) return
    try {
      const headers = response.headers()
      const sc = headers['set-cookie']
      if (!sc) return
      const list = Array.isArray(sc) ? sc : [sc]
      for (const c of list) {
        const match = /tr_session=([^;]+)/.exec(c)
        if (match && match[1] !== session.trSessionToken) {
          newToken = match[1]
          console.log('🔑 Nuevo JWT capturado desde respuesta HTTP')
        }
      }
    } catch { /* ignore */ }
  })

  await page.setRequestInterception(true)
  page.on('request', r => r.continue())

  console.log('📡 Navegando a Trade Republic...')
  try {
    await page.goto(TR_APP_URL, { waitUntil: 'networkidle2', timeout: 30_000 })
  } catch {
    // Ignore timeout errors — we just need cookies to be set
  }

  // Wait a bit for the app to make API calls and refresh tokens
  await new Promise(r => setTimeout(r, 5_000))

  // Read updated cookies via CDP
  const { cookies: allCookies } = await cdp.send('Network.getAllCookies') as { cookies: CDPCookie[] }
  const trCookies = allCookies.filter(c => c.domain.includes('traderepublic'))

  const trSessionCookie = trCookies.find(c => c.name === 'tr_session')
  if (trSessionCookie && trSessionCookie.value !== session.trSessionToken) {
    newToken = trSessionCookie.value
    console.log('🔑 Nuevo JWT capturado via CDP')
  }

  await browser.close()

  if (!newToken) {
    console.warn('⚠️  No se capturó un nuevo JWT.')
    console.warn('   El JWT actual puede seguir siendo válido, o la sesión expiró completamente.')
    console.warn('   Si el sync sigue fallando → ejecuta pnpm tr:auth (login completo con OTP)')
    // Don't fail — the existing session might still work
    process.exit(0)
  }

  // Update session file
  const rawCookies = trCookies.map(
    c => `${c.name}=${c.value}; Path=${c.path}; Domain=${c.domain}`
  )
  const updated: SessionData = { trSessionToken: newToken, rawCookies }
  await fs.writeFile(SESSION_FILE, JSON.stringify(updated, null, 2), {
    encoding: 'utf-8', mode: 0o600,
  })

  const b64 = Buffer.from(JSON.stringify(updated, null, 2)).toString('base64')

  console.log(`\n✅ Sesión renovada. Token: ${newToken.slice(0, 20)}...`)
  console.log('\nActualiza el GitHub Secret TR_COOKIE_FILE_B64 con este valor:')
  console.log(b64)
}

main().catch((err: unknown) => { console.error('Error:', err); process.exit(1) })
