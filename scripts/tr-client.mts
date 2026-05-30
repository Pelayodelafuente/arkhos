/**
 * Trade Republic WebSocket client — ESM version for scripts
 * Same logic as src/lib/tr/websocket.ts but as .mts for CJS/ESM compatibility
 */

import WebSocket from 'ws'

const TR_WS_URL = 'wss://api.traderepublic.com'

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

      if (!connected && (msg === 'connected' || msg.startsWith('connected '))) {
        clearTimeout(connectTimeout)
        connected = true
        resolve(client)
        return
      }

      const spaceIdx = msg.indexOf(' ')
      if (spaceIdx === -1) return
      const id = parseInt(msg.slice(0, spaceIdx), 10)
      if (isNaN(id)) return
      const callback = pending.get(id)
      if (callback) callback(msg.slice(spaceIdx + 1))
    })

    ws.on('close', (code, reason) => {
      clearTimeout(connectTimeout)
      if (!connected) reject(new Error(`WS closed: ${code} ${reason.toString()}`))
    })

    ws.on('error', (err) => {
      clearTimeout(connectTimeout)
      reject(err)
    })

    const client: TRClient = {
      subscribeOnce<T>(type: string, params?: Record<string, unknown>): Promise<T> {
        return new Promise((res, rej) => {
          const id = nextId++
          const t = setTimeout(() => {
            pending.delete(id)
            rej(new Error(`Timeout esperando '${type}'`))
          }, 20_000)

          pending.set(id, (raw) => {
            clearTimeout(t)
            pending.delete(id)
            try { res(parseRaw<T>(raw)) }
            catch (e) { rej(e) }
          })

          ws.send(`sub ${id} ${JSON.stringify({ type, ...params })}`)
        })
      },
      close() { ws.close() },
    }
  })
}

export async function fetchTickerPrice(
  client: TRClient,
  isin: string,
  exchange = 'LSX'
): Promise<number | null> {
  try {
    const ticker = await client.subscribeOnce<{ last?: { price: string } }>('ticker', {
      id: `${isin}.${exchange}`,
    })
    const p = parseFloat(ticker.last?.price ?? '')
    return isNaN(p) ? null : p
  } catch {
    return null
  }
}

function parseRaw<T>(raw: string): T {
  try { return JSON.parse(raw) as T } catch { /* fall through */ }

  let depth = 0, inStr = false, esc = false, jsonEnd = -1
  const start = raw.search(/[{[]/)
  if (start === -1) throw new SyntaxError(`No JSON in: ${raw.slice(0, 80)}`)

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') { depth--; if (depth === 0) { jsonEnd = i; break } }
  }

  if (jsonEnd !== -1) return JSON.parse(raw.slice(start, jsonEnd + 1)) as T
  throw new SyntaxError(`Cannot parse: ${raw.slice(0, 120)}`)
}
