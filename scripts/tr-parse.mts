/**
 * Helper para parsear respuestas del WebSocket de Trade Republic.
 */

export function parseTRResponse<T>(raw: string): T {
  // Fast path — clean JSON
  try {
    return JSON.parse(raw) as T
  } catch { /* fall through */ }

  // Log the exact raw string for debugging (hex dump of first 100 chars)
  const hex = Array.from(raw.slice(0, 100))
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ')
  console.error('TR raw response (text):', JSON.stringify(raw.slice(0, 120)))
  console.error('TR raw response (hex):', hex)
  console.error('TR raw length:', raw.length)

  // Try slicing to first valid JSON boundary
  // Scan from start to find the outermost { } or [ ]
  let depth = 0
  let inString = false
  let escape = false
  let jsonEnd = -1

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0) { jsonEnd = i; break }
    }
  }

  if (jsonEnd !== -1) {
    const jsonStart = raw.search(/[{[]/)
    const candidate = raw.slice(jsonStart, jsonEnd + 1)
    try {
      const result = JSON.parse(candidate) as T
      console.error('TR parse fixed: sliced to', jsonStart, '-', jsonEnd)
      return result
    } catch (e) {
      console.error('Slice attempt failed:', e)
    }
  }

  throw new SyntaxError(`Cannot parse TR response at len=${raw.length}: ${JSON.stringify(raw.slice(0, 120))}`)
}
