// ══════════════════════════════════════
// Arkhos OPS — paleta canónica de la escena 3D
// WebGL no puede leer CSS variables por frame: este objeto es la única
// fuente de color para materiales/luces de la sala. Debe mantenerse en
// espejo con las vars --sala-* de globals.css.
// ══════════════════════════════════════

export const SALA_COLORS = {
  bg: "#07070F",
  fog: "#07070F",
  copper: "#D4845A",
  copperDark: "#A85C35",
  copperDeep: "#5C2E18",
  floor: "#0B0B14",
  wall: "#0D0D17",
  metal: "#14141F",
  metalDark: "#0A0A12",
  screenOff: "#050508",
  text: "#F0EDE8",
  textDim: "#8A867E",
  gain: "#2E7D6B",
  loss: "#A32D2D",
} as const;

export type SalaColor = (typeof SALA_COLORS)[keyof typeof SALA_COLORS];
