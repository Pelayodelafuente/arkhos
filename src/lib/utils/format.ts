/**
 * Format a number as currency string.
 * @example formatCurrency(1234.5, 'EUR') → '1.234,50 €'
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Adjust an array of percentages so their toFixed(decimals) values sum to exactly 100.
 * Uses the Largest Remainder Method to avoid 100.1% / 99.9% display artifacts.
 * Returns a new array with the same structure but corrected `percentage` values.
 */
export function largestRemainder<T extends { percentage: number }>(
  items: T[],
  decimals = 1
): T[] {
  if (items.length === 0) return items;
  const factor = Math.pow(10, decimals);
  const floors = items.map((item) => Math.floor(item.percentage * factor) / factor);
  const remainders = items.map((item) => item.percentage * factor - Math.floor(item.percentage * factor));
  const floorSum = floors.reduce((s, v) => s + v, 0);
  const toDistribute = Math.round((100 - floorSum) * factor);
  const order = remainders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r)
    .map((x) => x.i);
  const bonuses = new Array<number>(items.length).fill(0);
  for (let k = 0; k < toDistribute; k++) bonuses[order[k]] = 1 / factor;
  return items.map((item, i) => ({ ...item, percentage: floors[i] + bonuses[i] }));
}

/**
 * Format a Date as a relative time string (e.g. "hace 3 horas").
 */
export function relativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'ahora mismo'
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Format a EUR amount in es-ES. Fuente única — sustituye a los `formatEur` locales.
 * @example formatEur(1234.5) → '1.234,50 €' · formatEur(1234.5, 0) → '1.235 €'
 */
export function formatEur(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: maxFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(value)
}

/**
 * Compact EUR for chart axes / tight spaces. Fuente única — sustituye a los
 * `formatEurShort` / `formatCompact` locales.
 * @example formatEurShort(12345) → '12,3k€' · formatEurShort(2_500_000) → '2,5M€' · formatEurShort(950) → '950€'
 */
export function formatEurShort(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M€`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1).replace('.', ',')}k€`
  return `${value.toFixed(0)}€`
}

/**
 * Format a percentage value already expressed in % (e.g. 12.34 → '12,34%').
 * Fuente única — sustituye a los `formatPct` / `fmtPct` locales.
 * @example formatPct(12.345) → '12,35%' · formatPct(12.3, true) → '+12,30%'
 */
export function formatPct(value: number, signed = false, decimals = 2): string {
  const sign = signed && value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals).replace('.', ',')}%`
}
