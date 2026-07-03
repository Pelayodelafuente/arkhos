import React from 'react'

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  success:    { background: 'var(--success-bg)',    color: 'var(--success-text)',    borderColor: 'var(--success-border)' },
  error:      { background: 'var(--error-bg)',      color: 'var(--error-text)',      borderColor: 'var(--error-border)' },
  warning:    { background: 'var(--warning-bg)',    color: 'var(--warning-text)',    borderColor: 'var(--warning-border)' },
  neutral:    { background: 'var(--neutral-bg)',    color: 'var(--neutral-text)',    borderColor: 'var(--neutral-border)' },
  // Módulos: texto = color del módulo mezclado con --text-primary → se oscurece
  // en modo claro y se aclara en oscuro sin variantes manuales.
  proyectos:  { background: 'color-mix(in srgb, var(--module-proyectos) 10%, transparent)',  color: 'color-mix(in srgb, var(--module-proyectos) 65%, var(--text-primary))', borderColor: 'color-mix(in srgb, var(--module-proyectos) 30%, transparent)' },
  mercados:   { background: 'color-mix(in srgb, var(--module-mercados) 10%, transparent)',   color: 'color-mix(in srgb, var(--module-mercados) 65%, var(--text-primary))', borderColor: 'color-mix(in srgb, var(--module-mercados) 30%, transparent)' },
  patrimonio: { background: 'color-mix(in srgb, var(--module-patrimonio) 10%, transparent)', color: 'color-mix(in srgb, var(--module-patrimonio) 65%, var(--text-primary))', borderColor: 'color-mix(in srgb, var(--module-patrimonio) 30%, transparent)' },
  gastos:     { background: 'color-mix(in srgb, var(--module-gastos) 10%, transparent)',     color: 'color-mix(in srgb, var(--module-gastos) 65%, var(--text-primary))', borderColor: 'color-mix(in srgb, var(--module-gastos) 30%, transparent)' },
  notas:      { background: 'color-mix(in srgb, var(--module-notas) 10%, transparent)',      color: 'color-mix(in srgb, var(--module-notas) 65%, var(--text-primary))', borderColor: 'color-mix(in srgb, var(--module-notas) 30%, transparent)' },
  // Legacy aliases
  terracotta: { background: 'color-mix(in srgb, var(--accent-terracotta) 10%, transparent)', color: 'color-mix(in srgb, var(--accent-terracotta) 65%, var(--text-primary))', borderColor: 'color-mix(in srgb, var(--accent-terracotta) 30%, transparent)' },
  green:      { background: 'var(--success-bg)',    color: 'var(--success-text)',    borderColor: 'var(--success-border)' },
  blue:       { background: 'color-mix(in srgb, var(--module-gastos) 10%, transparent)', color: 'color-mix(in srgb, var(--module-gastos) 65%, var(--text-primary))', borderColor: 'color-mix(in srgb, var(--module-gastos) 30%, transparent)' },
  gold:       { background: 'var(--warning-bg)',    color: 'var(--warning-text)',    borderColor: 'var(--warning-border)' },
  gray:       { background: 'var(--neutral-bg)',    color: 'var(--neutral-text)',    borderColor: 'var(--neutral-border)' },
}

const DOT_COLORS: Record<string, string> = {
  success:    'var(--success)',
  error:      'var(--error)',
  warning:    'var(--warning)',
  neutral:    'var(--neutral)',
  proyectos:  'var(--module-proyectos)',
  mercados:   'var(--module-mercados)',
  patrimonio: 'var(--module-patrimonio)',
  gastos:     'var(--module-gastos)',
  notas:      'var(--module-notas)',
}

const SEMANTIC_VARIANTS = new Set(['success', 'error', 'warning', 'neutral'])

export type BadgeVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'neutral'
  | 'proyectos'
  | 'mercados'
  | 'patrimonio'
  | 'gastos'
  | 'notas'
  | 'terracotta'
  | 'green'
  | 'blue'
  | 'gold'
  | 'gray'

interface BadgeProps {
  variant?: BadgeVariant
  showDot?: boolean
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'neutral', showDot, className = '', children }: BadgeProps) {
  const style = BADGE_STYLES[variant] ?? BADGE_STYLES.neutral
  const dotColor = DOT_COLORS[variant]
  const shouldShowDot = showDot ?? SEMANTIC_VARIANTS.has(variant)

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border ${className}`}
      style={style}
    >
      {shouldShowDot && dotColor && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: dotColor }}
        />
      )}
      {children}
    </span>
  )
}
