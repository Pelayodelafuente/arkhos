export const MODULE_COLORS = {
  proyectos:  '#C4704A',
  mercados:   '#7260C4',
  patrimonio: '#2E7D6B',
  gastos:     '#3B78B0',
  notas:      '#B07A3A',
  agenda:     '#8A5A7A',
} as const

export const COLOR_PRESETS = [
  { name: 'Terracota',  value: '#C4704A' },
  { name: 'Violeta',    value: '#7260C4' },
  { name: 'Esmeralda',  value: '#2E7D6B' },
  { name: 'Azul',       value: '#3B78B0' },
  { name: 'Ámbar',      value: '#B07A3A' },
  { name: 'Pizarra',    value: '#6B7280' },
  { name: 'Rosa',       value: '#C4607A' },
  { name: 'Índigo',     value: '#5B6DAE' },
] as const

export const SEMANTIC_COLORS = {
  success: { bg: '#F0FDF4', border: '#86EFAC', text: '#15803D', dot: '#22C55E' },
  error:   { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', dot: '#EF4444' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', dot: '#F59E0B' },
  neutral: { bg: '#F9FAFB', border: '#D1D5DB', text: '#374151', dot: '#6B7280' },
} as const
