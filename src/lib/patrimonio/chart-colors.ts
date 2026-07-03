/**
 * Colores semánticos para charts del módulo Patrimonio.
 * Fuente única de verdad — evitar hex dispersos en componentes.
 * Referencias a CSS variables: siguen automáticamente el tema claro/oscuro
 * (SVG/Recharts resuelve var() sin problema).
 */
export const C = {
  green:  "var(--color-gain)",
  red:    "var(--color-loss)",
  amber:  "var(--color-neutral-fin)",
  blue:   "var(--module-gastos)",
  purple: "var(--module-mercados)",
  gray:   "var(--text-muted)",
  border: "var(--border-stone)",
} as const;

/** Fondos tenues (≈10-12% alpha) — usar en vez de concatenar alpha al hex. */
export const C_SUBTLE = {
  green:  "var(--color-gain-subtle)",
  red:    "var(--color-loss-subtle)",
  amber:  "var(--color-neutral-subtle)",
  blue:   "color-mix(in srgb, var(--module-gastos) 10%, transparent)",
  purple: "color-mix(in srgb, var(--module-mercados) 10%, transparent)",
} as const;
