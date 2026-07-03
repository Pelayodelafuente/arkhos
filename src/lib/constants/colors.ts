// Paleta Primary (fusión 2026-07-03) — ver docs/mockups/arkhos-primary-fusion.html
// MODULE_COLORS y SEMANTIC_COLORS apuntan a las CSS variables (siguen el tema
// claro/oscuro). COLOR_PRESETS se persiste en la DB → hex fijos de la paleta.

export const MODULE_COLORS = {
  proyectos:  'var(--module-proyectos)',
  mercados:   'var(--module-mercados)',
  patrimonio: 'var(--module-patrimonio)',
  gastos:     'var(--module-gastos)',
  notas:      'var(--module-notas)',
  agenda:     'var(--module-agenda)',
} as const

export const COLOR_PRESETS = [
  { name: 'Naranja',    value: '#EB7D42' }, // orange-20
  { name: 'Violeta',    value: '#7D71C1' }, // purple
  { name: 'Esmeralda',  value: '#329562' }, // green-30
  { name: 'Azul',       value: '#3079B0' }, // blue
  { name: 'Ámbar',      value: '#D79719' }, // yellow-30
  { name: 'Rosa',       value: '#C7707D' }, // pink
  { name: 'Cian',       value: '#4CAEAA' }, // cyan
  { name: 'Piedra',     value: '#9D8062' }, // gray-90
] as const

export const SEMANTIC_COLORS = {
  success: { bg: 'var(--success-bg)', border: 'var(--success-border)', text: 'var(--success-text)', dot: 'var(--success)' },
  error:   { bg: 'var(--error-bg)',   border: 'var(--error-border)',   text: 'var(--error-text)',   dot: 'var(--error)' },
  warning: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', text: 'var(--warning-text)', dot: 'var(--warning)' },
  neutral: { bg: 'var(--neutral-bg)', border: 'var(--neutral-border)', text: 'var(--neutral-text)', dot: 'var(--neutral)' },
} as const
