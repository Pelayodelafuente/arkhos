// ══════════════════════════════════════
// Arkhos — Notes Store: slice del grafo de conocimiento
// Datos de la vista grafo: todas las notas ligeras (≤500, sin content) +
// todos los backlinks del usuario. La megacarga solo trae 30 notas y cero
// backlinks, por eso el grafo carga aparte (barato: campos de lista).
// ══════════════════════════════════════

import type { StateCreator } from 'zustand'
import * as notesApi from '@/lib/supabase/notes'
import { toast } from '@/stores/notes/helpers'
import type { NotesStore, NotesGraphSlice } from '@/stores/notes/types'

export const createNotesGraphSlice: StateCreator<NotesStore, [], [], NotesGraphSlice> = (
  set,
  get
) => ({
  graphNotes: [],
  graphBacklinks: [],
  graphLoaded: false,
  isGraphLoading: false,

  loadGraphData: async (userId, opts) => {
    if (get().isGraphLoading) return
    set({ isGraphLoading: true })
    try {
      if (get().graphLoaded && !opts?.force) {
        // Reentrada: las notas ya están; refrescar solo los enlaces (query minúscula)
        const backlinks = await notesApi.getAllBacklinksForGraph()
        set({ graphBacklinks: backlinks, isGraphLoading: false })
        return
      }
      const [notes, backlinks] = await Promise.all([
        notesApi.getNotesForGraph(userId),
        notesApi.getAllBacklinksForGraph(),
      ])
      set({
        graphNotes: notes,
        graphBacklinks: backlinks,
        graphLoaded: true,
        isGraphLoading: false,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar el grafo'
      set({ isGraphLoading: false })
      toast(msg, 'error')
    }
  },

  invalidateGraph: () => set({ graphLoaded: false }),

  // NotePane resuelve la nota buscando en s.notes (paginado a 30): si el nodo
  // clicado no está en la página cargada, lo insertamos desde graphNotes.
  ensureNoteInList: (noteId) => {
    const { notes, graphNotes } = get()
    if (notes.some((n) => n.id === noteId)) return
    const graphNote = graphNotes.find((n) => n.id === noteId)
    if (graphNote) {
      set((s) => ({ notes: [...s.notes, graphNote] }))
    }
  },
})
