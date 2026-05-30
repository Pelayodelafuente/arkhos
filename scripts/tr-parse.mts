/**
 * Helper para parsear respuestas del WebSocket de Trade Republic.
 * TR puede enviar bytes extra tras el JSON — este parser los descarta.
 */

export function parseTRResponse<T>(raw: string): T {
  // Fast path — clean JSON
  try {
    return JSON.parse(raw) as T
  } catch { /* fall through */ }

  // TR may append a single character (status byte) after the closing bracket.
  // Find the last } or ] that closes the top-level structure.
  const lastBrace = raw.lastIndexOf('}')
  const lastBracket = raw.lastIndexOf(']')
  const end = Math.max(lastBrace, lastBracket)

  if (end !== -1) {
    try {
      return JSON.parse(raw.slice(0, end + 1)) as T
    } catch { /* fall through */ }
  }

  // Find first JSON token and try from there
  const start = raw.search(/[{[]/)
  if (start !== -1 && end !== -1) {
    return JSON.parse(raw.slice(start, end + 1)) as T
  }

  throw new SyntaxError(`Cannot parse TR response: ${raw.slice(0, 120)}`)
}
