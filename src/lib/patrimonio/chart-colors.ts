/**
 * Colores semánticos para charts del módulo Patrimonio.
 * Fuente única de verdad — evitar hex dispersos en componentes.
 * Los valores deben coincidir con las CSS variables de globals.css.
 */
export const C = {
  green:  "#2E7D6B", // --module-patrimonio (ganancia / positivo)
  red:    "#A32D2D", // pérdida / negativo
  amber:  "#B07A3A", // --module-notas / neutral / dividendos
  blue:   "#4A7A9B", // --module-gastos approx / plan ahorro / intereses
  purple: "#7260C4", // saveback
  gray:   "#888780", // --text-tertiary approx / línea invertido
  border: "#E2D9CA", // --border approx / gradiente invertido
} as const;
