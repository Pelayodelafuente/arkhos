import { create } from 'zustand';

// ─── Types ───────────────────────────

interface WindowPosition {
  x: number;
  y: number;
}

export interface AnalysisBadge {
  text: string;
  variant: 'terracotta' | 'green' | 'gray';
}

interface CanvasState {
  positions: Record<string, WindowPosition>;
  windowOrder: string[];
  zoom: number;
  selectedProjectId: string | null;
  hasAnimated: boolean;
  analysisBadge: AnalysisBadge;
}

interface CanvasActions {
  setPosition: (windowId: string, pos: WindowPosition) => void;
  bringToFront: (windowId: string) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setSelectedProjectId: (id: string | null) => void;
  setAnalysisBadge: (badge: AnalysisBadge) => void;
  resetLayout: () => void;
  setHasAnimated: () => void;
  loadLayout: (userId: string) => void;
  saveLayout: (userId: string) => void;
}

type CanvasStore = CanvasState & CanvasActions;

// ─── Constants ───────────────────────

export const WINDOW_IDS = ['projects', 'stats', 'analysis', 'context', 'chat'] as const;
export type WindowId = (typeof WINDOW_IDS)[number];

const DEFAULT_POSITIONS: Record<string, WindowPosition> = {
  projects: { x: 32, y: 68 },
  stats: { x: 260, y: 68 },
  analysis: { x: 496, y: 68 },
  context: { x: 32, y: 350 },
  chat: { x: 248, y: 332 },
};

const STORAGE_KEY_PREFIX = 'arkhos-canvas-layout';

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}-${userId}`;
}

// ─── Store ───────────────────────────

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // State
  positions: { ...DEFAULT_POSITIONS },
  windowOrder: [...WINDOW_IDS],
  zoom: 100,
  selectedProjectId: null,
  hasAnimated: false,
  analysisBadge: { text: 'Esperando...', variant: 'gray' },

  // Actions
  setPosition: (windowId, pos) => {
    set((s) => ({
      positions: { ...s.positions, [windowId]: pos },
    }));
  },

  bringToFront: (windowId) => {
    set((s) => {
      const filtered = s.windowOrder.filter((id) => id !== windowId);
      return { windowOrder: [...filtered, windowId] };
    });
  },

  setZoom: (zoom) => {
    const clamped = Math.min(200, Math.max(50, zoom));
    set({ zoom: clamped });
  },

  zoomIn: () => {
    const current = get().zoom;
    get().setZoom(current + 10);
  },

  zoomOut: () => {
    const current = get().zoom;
    get().setZoom(current - 10);
  },

  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  setAnalysisBadge: (badge) => set({ analysisBadge: badge }),

  resetLayout: () => {
    set({
      positions: { ...DEFAULT_POSITIONS },
      windowOrder: [...WINDOW_IDS],
      zoom: 100,
    });
  },

  setHasAnimated: () => set({ hasAnimated: true }),

  loadLayout: (userId) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(getStorageKey(userId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        positions?: Record<string, WindowPosition>;
        zoom?: number;
      };
      if (parsed.positions) {
        set({ positions: parsed.positions });
      }
      if (typeof parsed.zoom === 'number') {
        set({ zoom: Math.min(200, Math.max(50, parsed.zoom)) });
      }
    } catch {
      // Ignore malformed localStorage data
    }
  },

  saveLayout: (userId) => {
    if (typeof window === 'undefined') return;
    try {
      const { positions, zoom } = get();
      localStorage.setItem(
        getStorageKey(userId),
        JSON.stringify({ positions, zoom })
      );
    } catch {
      // Ignore storage errors (quota, etc.)
    }
  },
}));
