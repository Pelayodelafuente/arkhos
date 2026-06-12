// ══════════════════════════════════════
// Arkhos — Notes Store: helpers compartidos entre slices
// ══════════════════════════════════════

import { CANVAS_BOUNDS } from '@/types/notes'
import { useUIStore } from '@/stores/ui-store'

// ─── Toast helper ─────────────────────

export function toast(message: string, variant: 'success' | 'error' | 'info' = 'info') {
  useUIStore.getState().addToast(message, variant)
}

// ─── Canvas helpers ──────────────────

export function clampNodePosition(x: number, y: number, width: number, height: number) {
  return {
    x: Math.max(CANVAS_BOUNDS.minX, Math.min(x, CANVAS_BOUNDS.maxX - width)),
    y: Math.max(CANVAS_BOUNDS.minY, Math.min(y, CANVAS_BOUNDS.maxY - height)),
  }
}
