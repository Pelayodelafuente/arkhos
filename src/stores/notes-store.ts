// ══════════════════════════════════════
// Arkhos — Notes Store (Zustand)
// Barrel: el store vive troceado en slices en src/stores/notes/
// API pública intacta (F3.4 AUDITORIA-GLOBAL.md):
//   useNotesStore · useFilteredNotes · useCanvasSearchResults · useAllTags · NoteSortMode
// ══════════════════════════════════════

export { useNotesStore } from '@/stores/notes/store'
export { useFilteredNotes, useCanvasSearchResults, useAllTags } from '@/stores/notes/hooks'
export type { NoteSortMode } from '@/types/notes'
