// Custom Trade Republic WebSocket client
// Uses session cookies (web app auth) instead of JWT mobile API auth
// Server-side only — never import in client components

import WebSocket from 'ws'
import type { TRPortfolioResponse, TRCashResponse, TRTimelineSection } from './types'

const TR_WS_URL = 'wss://api.traderepublic.com/api/v1/'

export interface TRClient {
  subscribeOnce: <T>(type: string, params?: Record<string, unknown>) => Promise<T>
  close: () => void
}

export async function connectTR(rawCookies: string[]): Promise<TRClient> {
  const cookieHeader = rawCookies
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(TR_WS_URL, {
      headers: {
        Cookie: cookieHeader,
        Origin: 'https://app.traderepublic.com',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      },
    })

    const pending = new Map<number, (payload: string) => void>()
    let nextId = 1
    let connected = false

    const connectTimeout = setTimeout(() => {
      ws.close()
      reject(new Error('TR WebSocket connection timeout after 15s'))
    }, 15_000)

    ws.on('open', () => {
      // Web app connect format — no token needed
      ws.send(
        `connect 21 ${JSON.stringify({
          locale: 'es',
          platformId: 'webApp',
          clientId: 'arkhos-sync',
          clientVersion: '1.0.0',
        })}`
      )
    })

    ws.on('message', (data: Buffer) => {
      const msg = data.toString()

      // Server confirms connection
      if (!connected && (msg === 'connected' || msg.startsWith('connected '))) {
        clearTimeout(connectTimeout)
        connected = true
        resolve(client)
        return
      }

      // Parse "ID JSON_PAYLOAD"
      const spaceIdx = msg.indexOf(' ')
      if (spaceIdx === -1) return

      const id = parseInt(msg.slice(0, spaceIdx), 10)
      if (isNaN(id)) return

      const callback = pending.get(id)
      if (callback) callback(msg.slice(spaceIdx + 1))
    })

    ws.on('close', (code, reason) => {
      clearTimeout(connectTimeout)
      if (!connected) {
        reject(new Error(`WS closed before connect: ${code} ${reason.toString()}`))
      }
    })

    ws.on('error', (err) => {
      clearTimeout(connectTimeout)
      reject(err)
    })

    const client: TRClient = {
      subscribeOnce<T>(type: string, params?: Record<string, unknown>): Promise<T> {
        return new Promise((res, rej) => {
          const id = nextId++
          const subTimeout = setTimeout(() => {
            pending.delete(id)
            rej(new Error(`Timeout esperando respuesta de '${type}'`))
          }, 20_000)

          pending.set(id, (raw) => {
            clearTimeout(subTimeout)
            pending.delete(id)
            try {
              res(parseRaw<T>(raw))
            } catch (e) {
              rej(e)
            }
          })

          ws.send(`sub ${id} ${JSON.stringify({ type, ...params })}`)
        })
      },

      close() {
        ws.close()
      },
    }
  })
}

// Parse TR WebSocket payload — TR may append extra bytes after the JSON
function parseRaw<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T
  } catch { /* fall through */ }

  // Scan for outermost JSON structure (handles trailing bytes)
  let depth = 0
  let inStr = false
  let esc = false
  let jsonEnd = -1
  const start = raw.search(/[{[]/)

  if (start === -1) throw new SyntaxError(`No JSON found: ${raw.slice(0, 80)}`)

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0) { jsonEnd = i; break }
    }
  }

  if (jsonEnd !== -1) {
    return JSON.parse(raw.slice(start, jsonEnd + 1)) as T
  }

  throw new SyntaxError(`Cannot parse TR response: ${raw.slice(0, 120)}`)
}

// Convenience: fetch cash, portfolio and timeline in parallel
export async function fetchTRData(rawCookies: string[]): Promise<{
  cash: TRCashResponse
  portfolio: TRPortfolioResponse
  timeline: TRTimelineSection[]
}> {
  const client = await connectTR(rawCookies)

  try {
    const [cash, portfolio, timelineRaw] = await Promise.all([
      client.subscribeOnce<TRCashResponse>('cash'),
      client.subscribeOnce<TRPortfolioResponse>('compactPortfolioByType'),
      client.subscribeOnce<{ sections?: TRTimelineSection[] }>('timelineTransactions'),
    ])

    return {
      cash,
      portfolio: { categories: portfolio.categories ?? [], products: [] },
      timeline: timelineRaw.sections ?? [],
    }
  } finally {
    client.close()
  }
}

// Fetch ticker price for an ISIN (exchange: LSX is default for EU ETFs)
export async function fetchTickerPrice(
  client: TRClient,
  isin: string,
  exchange = 'LSX'
): Promise<number | null> {
  try {
    const ticker = await client.subscribeOnce<{ last?: { price: string } }>('ticker', {
      id: `${isin}.${exchange}`,
    })
    const price = parseFloat(ticker.last?.price ?? '')
    return isNaN(price) ? null : price
  } catch {
    return null
  }
}
