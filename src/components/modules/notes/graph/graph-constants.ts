// ══════════════════════════════════════
// Arkhos — Grafo de Notas: constantes centralizadas
// Colores en un único sitio (patrón chart-colors): los valores CSS var
// se aplican vía style (los presentation attributes de SVG no soportan var()).
// ══════════════════════════════════════

import type { NoteColor } from '@/types/notes'

/** Color de nodo por NoteColor (carpeta o nota) — derivado de NOTE_COLOR_CONFIG.border */
export const GRAPH_NODE_COLORS: Record<NoteColor, string> = {
  default: 'var(--text-muted)',
  sage: 'var(--module-notas)',
  terracotta: 'var(--accent-terracotta)',
  stone: 'var(--text-faint)',
  blue: 'var(--module-gastos)',
  gold: '#C4974A',
}

export const GRAPH_LINK_COLOR = 'var(--text-faint)'
export const GRAPH_LINK_ACTIVE_COLOR = 'var(--module-notas)'

export const GRAPH_FORCES = {
  linkDistance: 90,
  linkStrength: 0.5,
  charge: -250,
  collidePadding: 4,
  /** forceX/forceY débiles hacia el centro (mejor que forceCenter con islas) */
  centerStrength: 0.05,
} as const

export const GRAPH_ZOOM_EXTENT: [number, number] = [0.2, 4]
/** Nivel de zoom k por debajo del cual se ocultan los labels (CSS via data-zoom) */
export const GRAPH_LABEL_ZOOM_THRESHOLD = 0.7

export const GRAPH_NODE_RADIUS = { base: 4, factor: 3, max: 16 } as const
export const GRAPH_LABEL_MAX_CHARS = 18
/** Ticks síncronos para asentar el layout con prefers-reduced-motion */
export const GRAPH_STATIC_TICKS = 300
