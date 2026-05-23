import React from 'react'

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  success:    { background: 'var(--success-bg)',    color: 'var(--success-text)',    borderColor: 'var(--success-border)' },
  error:      { background: 'var(--error-bg)',      color: 'var(--error-text)',      borderColor: 'var(--error-border)' },
  warning:    { background: 'var(--warning-bg)',    color: 'var(--warning-text)',    borderColor: 'var(--warning-border)' },
  neutral:    { background: 'var(--neutral-bg)',    color: 'var(--neutral-text)',    borderColor: 'var(--neutral-border)' },
  proyectos:  { background: 'rgba(196,112,74,0.10)',  color: '#8C4020', borderColor: 'rgba(196,112,74,0.30)' },
  mercados:   { background: 'rgba(155,122,74,0.10)',  color: '#6B4E20', borderColor: 'rgba(155,122,74,0.30)' },
  patrimonio: { background: 'rgba(46,125,107,0.10)',  color: '#1A5E50', borderColor: 'rgba(46,125,107,0.30)' },
  gastos:     { background: 'rgba(59,120,176,0.10)',  color: '#1E4F80', borderColor: 'rgba(59,120,176,0.30)' },
  notas:      { background: 'rgba(176,122,58,0.10)',  color: '#7A4E10', borderColor: 'rgba(176,122,58,0.30)' },
  // Legacy aliases
  terracotta: { background: 'rgba(196,112,74,0.10)',  color: '#8C4020', borderColor: 'rgba(196,112,74,0.30)' },
  green:      { background: 'var(--success-bg)',    color: 'var(--success-text)',    borderColor: 'var(--success-border)' },
  blue:       { background: 'rgba(59,120,176,0.10)', color: '#1E4F80', borderColor: 'rgba(59,120,176,0.30)' },
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
