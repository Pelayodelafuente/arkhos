// ══════════════════════════════════════
// Arkhos — Notes Store: slice de carpetas + papelera
// ══════════════════════════════════════

import type { StateCreator } from 'zustand'
import * as notesApi from '@/lib/supabase/notes'
import { toast } from '@/stores/notes/helpers'
import type { NotesStore, FoldersSlice } from '@/stores/notes/types'

export const createFoldersSlice: StateCreator<NotesStore, [], [], FoldersSlice> = (set, get) => ({
  // State
  folders: [],
  activeFolderId: null,
  trashedNotes: [],

  // ── Folders ───────────────────────

  fetchFolders: async (userId) => {
    try {
      const folders = await notesApi.getFolders(userId)
      set({ folders })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar las carpetas'
      toast(msg, 'error')
    }
  },

  addFolder: async (userId, data) => {
    try {
      const folder = await notesApi.createFolder(userId, data)
      set((s) => ({ folders: [...s.folders, folder] }))
      toast('Carpeta creada', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear la carpeta'
      toast(msg, 'error')
    }
  },

  editFolder: async (id, data) => {
    const prev = get().folders
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, ...data } : f)),
    }))
    try {
      await notesApi.updateFolder(id, data)
    } catch (e) {
      set({ folders: prev })
      const msg = e instanceof Error ? e.message : 'Error al editar la carpeta'
      toast(msg, 'error')
    }
  },

  removeFolder: async (id) => {
    const prev = get().folders
    set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }))
    // If removed folder was active, reset to all
    if (get().activeFolderId === id) {
      set({ activeFolderId: null })
    }
    try {
      await notesApi.deleteFolder(id)
      // Notes' folder_id set to null by DB cascade; update local state
      set((s) => ({
        notes: s.notes.map((n) => (n.folder_id === id ? { ...n, folder_id: null } : n)),
      }))
      toast('Carpeta eliminada', 'success')
    } catch (e) {
      set({ folders: prev })
      const msg = e instanceof Error ? e.message : 'Error al eliminar la carpeta'
      toast(msg, 'error')
    }
  },

  reorderFoldersAction: async (orderedIds) => {
    const prev = get().folders
    const reordered = orderedIds.map((id, i) => {
      const f = prev.find((x) => x.id === id)!
      return { ...f, sort_order: i }
    })
    set({ folders: reordered })
    try {
      await notesApi.reorderFolders(reordered.map((f) => ({ id: f.id, sort_order: f.sort_order })))
    } catch (e) {
      set({ folders: prev })
      const msg = e instanceof Error ? e.message : 'Error al reordenar carpetas'
      toast(msg, 'error')
    }
  },

  moveNoteToFolder: async (noteId, folderId) => {
    const prev = get().notes
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, folder_id: folderId } : n)),
    }))
    try {
      await notesApi.moveNoteToFolder(noteId, folderId)
    } catch (e) {
      set({ notes: prev })
      const msg = e instanceof Error ? e.message : 'Error al mover la nota'
      toast(msg, 'error')
    }
  },

  setActiveFolderId: (id) => set({ activeFolderId: id, selectedNoteId: null, activeTag: null }),

  // ── Trash (papelera) ──────────────

  restoreFromTrash: async (id) => {
    const note = get().trashedNotes.find((n) => n.id === id)
    if (!note) return
    const restored = { ...note, deleted_at: null }
    set((s) => ({
      trashedNotes: s.trashedNotes.filter((n) => n.id !== id),
      notes: [restored, ...s.notes],
    }))
    try {
      await notesApi.restoreNote(id)
      toast('Nota restaurada', 'success')
    } catch (e) {
      set((s) => ({
        trashedNotes: [note, ...s.trashedNotes],
        notes: s.notes.filter((n) => n.id !== id),
      }))
      const msg = e instanceof Error ? e.message : 'Error al restaurar la nota'
      toast(msg, 'error')
    }
  },

  permanentlyDelete: async (id) => {
    const prev = get().trashedNotes
    set((s) => ({ trashedNotes: s.trashedNotes.filter((n) => n.id !== id) }))
    try {
      await notesApi.hardDeleteNote(id)
      toast('Nota eliminada permanentemente', 'success')
    } catch (e) {
      set({ trashedNotes: prev })
      const msg = e instanceof Error ? e.message : 'Error al eliminar la nota'
      toast(msg, 'error')
    }
  },

  emptyTrash: async () => {
    const prev = get().trashedNotes
    if (prev.length === 0) return
    const userId = prev[0]?.user_id
    if (!userId) return
    set({ trashedNotes: [] })
    try {
      await notesApi.emptyTrash(userId)
      toast('Papelera vaciada', 'success')
    } catch (e) {
      set({ trashedNotes: prev })
      const msg = e instanceof Error ? e.message : 'Error al vaciar la papelera'
      toast(msg, 'error')
    }
  },

  fetchTrashedNotes: async (userId) => {
    try {
      const trashedNotes = await notesApi.getTrashedNotes(userId)
      set({ trashedNotes })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar la papelera'
      toast(msg, 'error')
    }
  },
})
