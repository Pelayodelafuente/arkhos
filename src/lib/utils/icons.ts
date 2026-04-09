// ══════════════════════════════════════
// Arkhos — Lucide Icon Utility
// Resuelve iconos por nombre de string evitando el cast repetido
// ══════════════════════════════════════

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const icons = LucideIcons as unknown as Record<string, LucideIcon>

/**
 * Devuelve el componente LucideIcon con el nombre dado, o null si no existe.
 */
export function getLucideIcon(name: string): LucideIcon | null {
  const icon = icons[name]
  return typeof icon === 'function' ? icon : null
}

/**
 * Devuelve el componente LucideIcon con el nombre dado, o el fallback si no existe.
 */
export function getLucideIconOrDefault(name: string, fallback: LucideIcon): LucideIcon {
  return getLucideIcon(name) ?? fallback
}
