/**
 * Trade Republic — Browser Authentication Script
 *
 * Abre Chrome visible, espera a que el usuario se loguee, y captura
 * el JWT real de las conexiones WebSocket internas de la web app.
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

interface CDPWebSocketFrame {
  requestId: string
  timestamp: number
  response: { opcode: number; mask: boolean; payloadData: string }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Trade Republic — Auth Setup')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('Se abrirá Chrome. Loguéate en Trade Republic.')
  console.log('El script captura el token JWT de las conexiones WebSocket.')
  console.log('')

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--start-maximized'],
  })

  const page = await browser.newPage()
  const cdp = await page.createCDPSession()

  // Enable Network events including WebSocket frames
  await cdp.send('Network.enable')

  let capturedToken: string | null = null
  const capturedCookieHeaders: string[] = []

  // Intercept HTTP response cookies (for rawCookies)
  await page.setRequestInterception(true)
  page.on('request', (req) => { req.continue() })
  page.on('response', async (response) => {
    if (!response.url().includes('traderepublic')) return
    try {
      const headers = response.headers()
      const sc = headers['set-cookie']
      if (sc) {
        const list = Array.isArray(sc) ? sc : [sc]
        list.forEach(c => { if (!capturedCookieHeaders.includes(c)) capturedCookieHeaders.push(c) })
      }
    } catch { /* ignore */ }
  })

  // Intercept WebSocket frames — look for the JWT token in subscription messages
  // TR web app sends: sub N {"token":"eyJ...","type":"..."}
  cdp.on('Network.webSocketFrameReceived', (params: CDPWebSocketFrame) => {
    try {
      const data = params.response.payloadData
      // WebSocket messages from server may contain token in echo/ack
      const tokenMatch = /"token"\s*:\s*"(eyJ[^"]+)"/.exec(data)
      if (tokenMatch && !capturedToken) {
        capturedToken = tokenMatch[1]
        console.log('\n🔑 JWT capturado desde WS (servidor):', capturedToken.slice(0, 20) + '...')
      }
    } catch { /* ignore */ }
  })

  // Also intercept outgoing frames (what the browser sends to TR)
  cdp.on('Network.webSocketFrameSent', (params: { requestId: string; timestamp: number; response: { opcode: number; mask: boolean; payloadData: string } }) => {
    try {
      const data = params.response.payloadData
      // Browser sends: sub N {"token":"eyJ...","type":"..."}
      const tokenMatch = /"token"\s*:\s*"(eyJ[^"]+)"/.exec(data)
      if (tokenMatch && !capturedToken) {
        capturedToken = tokenMatch[1]
        console.log('\n🔑 JWT capturado desde WS (cliente):', capturedToken.slice(0, 20) + '...')
      }
      // Also look for connect messages
      const connectMatch = /"jwt"\s*:\s*"(eyJ[^"]+)"/.exec(data)
      if (connectMatch && !capturedToken) {
        capturedToken = connectMatch[1]
        console.log('\n🔑 JWT capturado desde connect:', capturedToken.slice(0, 20) + '...')
      }
    } catch { /* ignore */ }
  })

  // Also intercept HTTP responses for token in JSON body
  cdp.on('Network.responseReceived', () => { /* just to keep network events flowing */ })

  console.log('🌐 Abriendo Trade Republic...')
  await page.goto(TR_APP_URL, { waitUntil: 'domcontentloaded' })

  console.log('👆 Loguéate en la ventana de Chrome.')
  console.log('   El script capturará el JWT automáticamente cuando se establezca el WebSocket...')
  console.log('')

  // Poll for token capture — up to 5 minutes
  const MAX_WAIT_MS = 5 * 60 * 1000
  const POLL_INTERVAL_MS = 2_000
  const start = Date.now()

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))

    const elapsed = Math.round((Date.now() - start) / 1000)

    if (capturedToken) break

    // Fallback: try to extract token via page evaluate (localStorage/memory)
    try {
      const pageToken = await page.evaluate((): string | null => {
        // Some SPAs store auth tokens in Redux/Zustand store or localStorage
        for (const key of Object.keys(localStorage)) {
          const val = localStorage.getItem(key) ?? ''
          if (val.startsWith('eyJ')) return val
          try {
            const parsed = JSON.parse(val) as Record<string, unknown>
            for (const v of Object.values(parsed)) {
              if (typeof v === 'string' && v.startsWith('eyJ')) return v
            }
          } catch { /* not JSON */ }
        }
        return null
      })
      if (pageToken && !capturedToken) {
        capturedToken = pageToken
        console.log(`\n🔑 JWT capturado desde localStorage (${elapsed}s)`)
        break
      }
    } catch { /* page may be navigating */ }

    process.stdout.write(`\r   [${elapsed}s] buscando JWT... cookies TR: ${capturedCookieHeaders.length}`)
  }

  // Get all cookies via CDP regardless
  const cdpResult = await cdp.send('Network.getAllCookies') as { cookies: CDPCookie[] }
  const trCookies = cdpResult.cookies.filter(c => c.domain.includes('traderepublic'))

  // Build rawCookies
  const rawCookies = trCookies.length > 0
    ? trCookies.map(c => `${c.name}=${c.value}; Path=${c.path}; Domain=${c.domain}`)
    : capturedCookieHeaders

  // Find tr_session in CDP cookies (might be there even if not captured via response)
  const trSessionCdp = trCookies.find(c => c.name === 'tr_session')
  if (trSessionCdp && !capturedToken) {
    capturedToken = trSessionCdp.value
    console.log('\n🔑 tr_session encontrado en CDP cookies')
  }

  await browser.close()

  if (!capturedToken) {
    console.error('\n❌ No se capturó el JWT.')
    console.error('   Cookies TR encontradas:', trCookies.map(c => `${c.name}=${c.value.slice(0, 20)}`).join(', '))
    console.error('')
    console.error('   Prueba manual: en Chrome DevTools mientras el dashboard está cargado,')
    console.error('   ve a Network → filtro "WS" → clic en la conexión a api.traderepublic.com')
    console.error('   → Messages → busca un mensaje con "token":"eyJ..."')
    process.exit(1)
  }

  const sessionData: SavedCookieData = {
    trSessionToken: capturedToken,
    rawCookies,
  }

  await fs.writeFile(SESSION_FILE, JSON.stringify(sessionData, null, 2), {
    encoding: 'utf-8', mode: 0o600,
  })

  console.log(`\n✅ Sesión guardada en ${SESSION_FILE}`)
  console.log(`   Token: ${capturedToken.slice(0, 25)}...`)
  console.log(`   Cookies TR: ${rawCookies.length}`)
  console.log('')

  const sessionContent = await fs.readFile(SESSION_FILE, 'utf-8')
  const sessionB64 = Buffer.from(sessionContent).toString('base64')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Secret name:  TR_COOKIE_FILE_B64')
  console.log('Secret value:')
  console.log(sessionB64)
  console.log('')
  console.log('Otros secrets:')
  console.log('  TR_USER_ID              = [UUID en Supabase: Auth → Users]')
  console.log('  NEXT_PUBLIC_SUPABASE_URL = [de .env.local]')
  console.log('  SUPABASE_SERVICE_ROLE_KEY = [de .env.local]')
  console.log('\nSiguiente paso: pnpm tr:test')
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
