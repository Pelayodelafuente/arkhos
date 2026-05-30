/**
 * Trade Republic client — usa trapi para la conexión (WAF) + WS directo para datos
 */

import { TradeRepublicApi } from 'trapi'
import type WebSocket from 'ws'

export interface TRClient {
  subscribeOnce: <T>(type: string, params?: Record<string, unknown>) => Promise<T>
  close: () => void
}

export interface TRSession {
  trSessionToken: string
  rawCookies: string[]
}

export async function connectTR(session: TRSession): Promise<TRClient> {
  // trapi reads ~/.tr_api_cookies.json automatically; we ensure it's there before calling
  const api = new TradeRepublicApi(
    process.env.TR_PHONE ?? 'noop',
    process.env.TR_PIN ?? 'noop'
  )

  const ok = await api.login()
  if (!ok) throw new Error('trapi login failed — session expired, run pnpm tr:auth again')

  // Access internal WebSocket directly (bypasses trapi's broken JSON parser)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws = (api as any).ws as WebSocket
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (api as any).trSessionToken as string

  let nextId = 10 // start high to avoid collisions with trapi's internal IDs

  const client: TRClient = {
    subscribeOnce<T>(type: string, params?: Record<string, unknown>): Promise<T> {
      return new Promise((resolve, reject) => {
        const id = nextId++
        const timeout = setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ws.off('message', onMessage as any)
          reject(new Error(`Timeout esperando '${type}' (${id})`))
        }, 20_000)

        function onMessage(data: Buffer) {
          const msg = data.toString()
          const spaceIdx = msg.indexOf(' ')
          if (spaceIdx === -1) return
          const msgId = parseInt(msg.slice(0, spaceIdx), 10)
          if (msgId !== id) return

          const payload = msg.slice(spaceIdx + 1)

          // TR may send a non-JSON ack (e.g. "OK") before the actual data.
          // Keep the listener alive until we get valid JSON.
          try {
            const parsed = parseRaw<T>(payload)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ws.off('message', onMessage as any)
            clearTimeout(timeout)
            resolve(parsed)
          } catch {
            // Not JSON yet — wait for next message with same ID
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ws.on('message', onMessage as any)
        ws.send(`sub ${id} ${JSON.stringify({ type, token, ...params })}`)
      })
    },

    close() { /* let trapi manage the WS lifecycle */ },
  }

  return client
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
  // Fast path
  try { return JSON.parse(raw) as T } catch { /* fall through */ }

  // Find outermost JSON object/array by scanning braces
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
    else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0) { jsonEnd = i; break }
    }
  }

  if (jsonEnd !== -1) return JSON.parse(raw.slice(start, jsonEnd + 1)) as T
  throw new SyntaxError(`Cannot parse TR response (len=${raw.length}): ${raw.slice(0, 120)}`)
}
