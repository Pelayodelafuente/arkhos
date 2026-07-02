// ══════════════════════════════════════
// Arkhos OPS — store de la sala 3D (Zustand)
// Estado de la experiencia: asignación slot→widget, foco, calidad y sonido.
// Los datos financieros NO viven aquí: se leen de los stores ya hidratados
// por la megacarga (dashboard, patrimonio, expenses, mercados).
// ══════════════════════════════════════

import { create } from "zustand";
import {
  DEFAULT_ASSIGNMENTS,
  loadStoredAssignments,
  saveAssignments,
  SALA_LAYOUT_STORAGE_KEY,
  type SalaAssignments,
  type SalaSlotId,
  type SalaWidgetKey,
} from "@/lib/sala/config";

export type SalaQuality = "alta" | "media";

interface SalaStore {
  assignments: SalaAssignments;
  focusedSlot: SalaSlotId | null;
  hoveredSlot: SalaSlotId | null;
  /** Slot que se está arrastrando (drag & drop del muro) */
  draggingSlot: SalaSlotId | null;
  /** Slot destino del arrastre actual (candidato a swap) */
  dropTargetSlot: SalaSlotId | null;
  soundOn: boolean;
  quality: SalaQuality;
  layoutHydrated: boolean;

  hydrateLayout: () => void;
  assignWidget: (slot: SalaSlotId, widget: SalaWidgetKey) => void;
  swapSlots: (a: SalaSlotId, b: SalaSlotId) => void;
  resetLayout: () => void;
  setFocusedSlot: (slot: SalaSlotId | null) => void;
  setHoveredSlot: (slot: SalaSlotId | null) => void;
  setDraggingSlot: (slot: SalaSlotId | null) => void;
  setDropTargetSlot: (slot: SalaSlotId | null) => void;
  toggleSound: () => void;
  setQuality: (quality: SalaQuality) => void;
}

export const useSalaStore = create<SalaStore>((set, get) => ({
  assignments: { ...DEFAULT_ASSIGNMENTS },
  focusedSlot: null,
  hoveredSlot: null,
  draggingSlot: null,
  dropTargetSlot: null,
  soundOn: false,
  quality: "alta",
  layoutHydrated: false,

  hydrateLayout: () => {
    set({ assignments: loadStoredAssignments(), layoutHydrated: true });
  },

  assignWidget: (slot, widget) => {
    const next = { ...get().assignments, [slot]: widget };
    saveAssignments(next);
    set({ assignments: next });
  },

  swapSlots: (a, b) => {
    const current = get().assignments;
    const next = { ...current, [a]: current[b], [b]: current[a] };
    saveAssignments(next);
    set({ assignments: next });
  },

  resetLayout: () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(SALA_LAYOUT_STORAGE_KEY);
      } catch {
        // sin persistencia disponible
      }
    }
    set({ assignments: { ...DEFAULT_ASSIGNMENTS } });
  },

  setFocusedSlot: (slot) => set({ focusedSlot: slot }),
  setHoveredSlot: (slot) => set({ hoveredSlot: slot }),
  setDraggingSlot: (slot) => set({ draggingSlot: slot }),
  setDropTargetSlot: (slot) => set({ dropTargetSlot: slot }),
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
  setQuality: (quality) => set({ quality }),
}));
