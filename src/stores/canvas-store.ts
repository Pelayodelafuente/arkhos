import { create } from 'zustand';

// ─── Types ───────────────────────────

export interface AnalysisBadge {
  text: string;
  variant: 'terracotta' | 'green' | 'gray';
}

interface CanvasState {
  selectedProjectId: string | null;
  minimizedWindows: Set<string>;
  analysisBadge: AnalysisBadge;
}

interface CanvasActions {
  setSelectedProjectId: (id: string | null) => void;
  setAnalysisBadge: (badge: AnalysisBadge) => void;
  toggleMinimized: (windowId: string) => void;
  isMinimized: (windowId: string) => boolean;
}

type CanvasStore = CanvasState & CanvasActions;

// ─── Store ───────────────────────────

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // State
  selectedProjectId: null,
  minimizedWindows: new Set<string>(),
  analysisBadge: { text: 'Próximamente', variant: 'gray' },

  // Actions
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  setAnalysisBadge: (badge) => set({ analysisBadge: badge }),

  toggleMinimized: (windowId) => {
    set((s) => {
      const next = new Set(s.minimizedWindows);
      if (next.has(windowId)) {
        next.delete(windowId);
      } else {
        next.add(windowId);
      }
      return { minimizedWindows: next };
    });
  },

  isMinimized: (windowId) => get().minimizedWindows.has(windowId),
}));
