// ══════════════════════════════════════
// Arkhos OPS — configuración del muro de pantallas
// El muro es un arco cilíndrico centrado en el operador: cada slot se
// define por ángulo horizontal + altura, y mira siempre hacia el puesto.
// ══════════════════════════════════════

export const SALA_WIDGET_KEYS = [
  "evolucion",
  "distribucion",
  "drawdown",
  "benchmark",
  "kpis",
  "topMovers",
  "gastos",
  "proximosPagos",
  "mercados",
  "sistema",
  "proyectos",
] as const;

export type SalaWidgetKey = (typeof SALA_WIDGET_KEYS)[number];

export type SalaSlotId =
  | "hero-1"
  | "hero-2"
  | "hero-3"
  | "mid-1"
  | "mid-2"
  | "mid-3"
  | "mid-4";

export interface SalaSlot {
  id: SalaSlotId;
  /** Ángulo horizontal sobre el arco del muro (grados; 0 = frente) */
  angleDeg: number;
  /** Altura del centro de la pantalla (unidades de escena) */
  y: number;
  /** Ancho × alto de la pantalla (unidades de escena) */
  w: number;
  h: number;
  tier: "hero" | "mid";
}

/** Centro del arco (z hacia el operador) y radio del muro */
export const WALL_ARC = { cx: 0, cz: 5, radius: 8.2 } as const;

export const SALA_SLOTS: readonly SalaSlot[] = [
  { id: "hero-1", angleDeg: -21, y: 2.25, w: 2.55, h: 1.5, tier: "hero" },
  { id: "hero-2", angleDeg: 0, y: 2.25, w: 2.55, h: 1.5, tier: "hero" },
  { id: "hero-3", angleDeg: 21, y: 2.25, w: 2.55, h: 1.5, tier: "hero" },
  { id: "mid-1", angleDeg: -27, y: 0.92, w: 1.72, h: 1.02, tier: "mid" },
  { id: "mid-2", angleDeg: -9, y: 0.92, w: 1.72, h: 1.02, tier: "mid" },
  { id: "mid-3", angleDeg: 9, y: 0.92, w: 1.72, h: 1.02, tier: "mid" },
  { id: "mid-4", angleDeg: 27, y: 0.92, w: 1.72, h: 1.02, tier: "mid" },
] as const;

export type SalaAssignments = Record<SalaSlotId, SalaWidgetKey>;

export const DEFAULT_ASSIGNMENTS: SalaAssignments = {
  "hero-1": "mercados",
  "hero-2": "evolucion",
  "hero-3": "distribucion",
  "mid-1": "kpis",
  "mid-2": "gastos",
  "mid-3": "proximosPagos",
  "mid-4": "sistema",
};

export const SALA_LAYOUT_STORAGE_KEY = "arkhos-sala-layout";

const SLOT_IDS = SALA_SLOTS.map((s) => s.id);

function isSlotId(value: string): value is SalaSlotId {
  return (SLOT_IDS as string[]).includes(value);
}

function isWidgetKey(value: unknown): value is SalaWidgetKey {
  return typeof value === "string" && (SALA_WIDGET_KEYS as readonly string[]).includes(value);
}

/**
 * Sanea un layout guardado: descarta slots/widgets desconocidos y rellena
 * huecos con los defaults (mismo espíritu que normalizeLayout del bento).
 */
export function normalizeAssignments(stored: unknown): SalaAssignments {
  const result: SalaAssignments = { ...DEFAULT_ASSIGNMENTS };
  if (typeof stored !== "object" || stored === null) return result;
  for (const [slot, widget] of Object.entries(stored)) {
    if (isSlotId(slot) && isWidgetKey(widget)) {
      result[slot] = widget;
    }
  }
  return result;
}

export function loadStoredAssignments(): SalaAssignments {
  if (typeof window === "undefined") return { ...DEFAULT_ASSIGNMENTS };
  try {
    const raw = window.localStorage.getItem(SALA_LAYOUT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ASSIGNMENTS };
    return normalizeAssignments(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_ASSIGNMENTS };
  }
}

export function saveAssignments(assignments: SalaAssignments): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SALA_LAYOUT_STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // localStorage lleno o bloqueado: el layout simplemente no persiste
  }
}
