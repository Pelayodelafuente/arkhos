// ══════════════════════════════════════
// Arkhos — Lucide Icon Utility
// Resuelve iconos por nombre de string evitando el cast repetido
// ══════════════════════════════════════

import { createElement } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'

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

interface DynamicLucideIconProps extends LucideProps {
  name: string
  fallback: LucideIcon
}

/**
 * Renderiza un icono Lucide resuelto por nombre en runtime.
 * Componente estable a nivel de módulo — evita crear componentes durante render.
 */
export function DynamicLucideIcon({ name, fallback, ...props }: DynamicLucideIconProps) {
  return createElement(getLucideIconOrDefault(name, fallback), props)
}
