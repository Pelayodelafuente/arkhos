// Props comunes de todo widget del muro: dimensiones del área de contenido
// en píxeles CSS (fijas por slot — sin ResponsiveContainer dentro de CSS3D).
export interface SalaWidgetProps {
  width: number;
  height: number;
}

/** Estilo compartido del tooltip de Recharts sobre fondo FUI */
export const SALA_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(10,10,18,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#F0EDE8",
};

/** Color de ticks/ejes de Recharts (espejo de --sala-text-dim) */
export const SALA_TICK = { fill: "#8A867E", fontSize: 9, fontFamily: "var(--font-mono)" };
export const SALA_GRID_STROKE = "rgba(255,255,255,0.05)";
