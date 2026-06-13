// ══════════════════════════════════════
// Cronos — Utilidades de fecha/hora
// ══════════════════════════════════════

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO → valor para <input type="datetime-local"> (hora local). */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** ISO → valor para <input type="date"> (fecha local). */
export function isoToDateInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Valor de un <input datetime-local|date> → ISO UTC. */
export function localInputToIso(local: string): string {
  return new Date(local).toISOString()
}

/** Clave de día local (YYYY-MM-DD) para agrupar items. */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const dayHeadingFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const timeFmt = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
})

/** "lunes, 15 de junio" con primera letra en mayúscula. */
export function formatDayHeading(iso: string): string {
  const s = dayHeadingFmt.format(new Date(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "10:00 – 11:30" o "Todo el día". */
export function formatTimeRange(startIso: string, endIso: string, allDay: boolean): string {
  if (allDay) return 'Todo el día'
  return `${timeFmt.format(new Date(startIso))} – ${timeFmt.format(new Date(endIso))}`
}

/** ¿La fecha cae hoy (hora local)? */
export function isToday(iso: string): boolean {
  return dayKey(iso) === dayKey(new Date().toISOString())
}
