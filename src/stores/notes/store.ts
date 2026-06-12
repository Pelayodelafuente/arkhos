// ══════════════════════════════════════
// Arkhos — Notes Store (Zustand)
// Ensambla los slices en un único store (patrón slices Zustand v5)
// Módulo Notas: optimistic updates + rollback + Toast
// ══════════════════════════════════════

import { create } from 'zustand'
import type { NotesStore } from '@/stores/notes/types'
import { createNotesSlice } from '@/stores/notes/notes-slice'
import { createNotesOrganizeSlice } from '@/stores/notes/notes-organize-slice'
import { createFoldersSlice } from '@/stores/notes/folders-slice'
import { createCanvasNodesSlice } from '@/stores/notes/canvas-nodes-slice'
import { createCanvasInteractionSlice } from '@/stores/notes/canvas-interaction-slice'

export const useNotesStore = create<NotesStore>()((...a) => ({
  ...createNotesSlice(...a),
  ...createNotesOrganizeSlice(...a),
  ...createFoldersSlice(...a),
  ...createCanvasNodesSlice(...a),
  ...createCanvasInteractionSlice(...a),
}))
