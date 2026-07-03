// ══════════════════════════════════════
// Arkhos — Notes Store: slice de notas (list view)
// Fetch, búsqueda server-side, paginación, CRUD optimista,
// hydration (setNotes) y filtros de lista
// ══════════════════════════════════════

import type { StateCreator } from 'zustand'
import type { NoteSortMode } from '@/types/notes'
import * as notesApi from '@/lib/supabase/notes'
import { toast } from '@/stores/notes/helpers'
import type { NotesStore, NotesSlice } from '@/stores/notes/types'

export const createNotesSlice: StateCreator<NotesStore, [], [], NotesSlice> = (set, get) => ({
  // State
  notes: [],
  initialized: false,
  isLoading: false,
  searchQuery: '',
  activeTag: null,
  viewMode: (() => {
    if (typeof window === 'undefined') return 'list'
    try {
      const v = localStorage.getItem('arkhos:notes:viewMode')
      if (v === 'canvas' || v === 'graph') return v
    } catch { /* ignore */ }
    return 'list'
  })() as 'list' | 'canvas' | 'graph',
  sortMode: 'recent' as NoteSortMode,
  selectedNoteId: null,
  notesOffset: 0,
  hasMoreNotes: true,
  isLoadingMore: false,
  isSearching: false,
  searchResults: [],

  // ── Fetch ───────────────────────────

  fetchNotes: async (userId) => {
    set({ isLoading: true, notes: [], notesOffset: 0, hasMoreNotes: true, searchResults: [], searchQuery: '' })
    try {
      const notes = await notesApi.getNotes(userId, 0)
      set({
        notes,
        initialized: true,
        isLoading: false,
        notesOffset: notes.length,
        hasMoreNotes: notes.length === notesApi.NOTES_PAGE_SIZE,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar las notas'
      set({ isLoading: false })
      toast(msg, 'error')
    }
  },

  loadMoreNotes: async (userId) => {
    const { hasMoreNotes, isLoadingMore, notesOffset, searchQuery } = get()
    if (!hasMoreNotes || isLoadingMore || searchQuery) return
    set({ isLoadingMore: true })
    try {
      const more = await notesApi.getNotes(userId, notesOffset)
      set((s) => {
        // Dedupe: ensureNoteInList (grafo) puede haber insertado ya alguna
        // nota que ahora llega en su página del servidor
        const seen = new Set(s.notes.map((n) => n.id))
        const fresh = more.filter((n) => !seen.has(n.id))
        return {
          notes: [...s.notes, ...fresh],
          notesOffset: notesOffset + more.length,
          hasMoreNotes: more.length === notesApi.NOTES_PAGE_SIZE,
          isLoadingMore: false,
        }
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar más notas'
      set({ isLoadingMore: false })
      toast(msg, 'error')
    }
  },

  loadNoteContent: async (noteId) => {
    const note = get().notes.find((n) => n.id === noteId)
    if (!note || note.contentLoaded) return
    try {
      const content = await notesApi.getNoteContent(noteId)
      set((s) => ({
        notes: s.notes.map((n) =>
          n.id === noteId ? { ...n, content, contentLoaded: true } : n
        ),
        searchResults: s.searchResults.map((n) =>
          n.id === noteId ? { ...n, content, contentLoaded: true } : n
        ),
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar el contenido'
      toast(msg, 'error')
    }
  },

  performSearch: async (userId, query) => {
    set({ searchQuery: query })
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false })
      return
    }
    set({ isSearching: true })
    try {
      const results = await notesApi.searchNotes(userId, query)
      set({ searchResults: results, isSearching: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al buscar notas'
      set({ isSearching: false })
      toast(msg, 'error')
    }
  },

  // ── Notes CRUD ─────────────────────

  addNote: async (userId, data) => {
    try {
      const note = await notesApi.createNote(userId, data)
      set((s) => ({
        notes: [note, ...s.notes],
        // Espejo al grafo si está cargado
        graphNotes: s.graphLoaded ? [note, ...s.graphNotes] : s.graphNotes,
      }))
      toast('Nota creada', 'success')
      return note
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear la nota'
      toast(msg, 'error')
      return null
    }
  },

  editNote: async (id, data) => {
    const prev = get().notes.find((n) => n.id === id)
    if (!prev) return

    // Optimistic
    const wordCount =
      data.content !== undefined
        ? data.content.trim().split(/\s+/).filter(Boolean).length
        : prev.word_count
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id
          ? { ...n, ...data, word_count: wordCount, updated_at: new Date().toISOString() }
          : n
      ),
      // Espejo al grafo (título/color/carpeta afectan a nodos)
      graphNotes: s.graphLoaded
        ? s.graphNotes.map((n) =>
            n.id === id
              ? { ...n, ...data, word_count: wordCount, updated_at: new Date().toISOString() }
              : n
          )
        : s.graphNotes,
    }))
    // Also update in canvasNodes if this note is on the canvas
    set((s) => ({
      canvasNodes: s.canvasNodes.map((cn) =>
        cn.note_id === id && cn.note
          ? {
              ...cn,
              note: {
                ...cn.note,
                ...data,
                word_count: wordCount,
                updated_at: new Date().toISOString(),
              },
            }
          : cn
      ),
    }))

    try {
      await notesApi.updateNote(id, data)
      // Fire-and-forget backlink sync whenever content changed
      if (data.content !== undefined) {
        get().syncBacklinksOnSave(id, data.content).catch((e: unknown) => { if (process.env.NODE_ENV === 'development') console.error(e) })
      }
    } catch (e) {
      // Rollback
      set((s) => ({ notes: s.notes.map((n) => (n.id === id ? prev : n)) }))
      const msg = e instanceof Error ? e.message : 'Error al guardar la nota'
      toast(msg, 'error')
    }
  },

  removeNote: async (id) => {
    // Soft-delete: move to trash.
    // Note may not be in get().notes if paginated out — don't fail silently.
    const note = get().notes.find((n) => n.id === id)
    const prev = get().notes
    const prevNodes = get().canvasNodes
    const prevEdges = get().canvasEdges
    const nodeToRemove = prevNodes.find((cn) => cn.note_id === id)
    // Optimistic: remove from canvas immediately regardless of whether note is in store
    set((s) => ({
      notes: note ? s.notes.filter((n) => n.id !== id) : s.notes,
      // Espejo al grafo: fuera el nodo y sus aristas
      graphNotes: s.graphLoaded ? s.graphNotes.filter((n) => n.id !== id) : s.graphNotes,
      graphBacklinks: s.graphLoaded
        ? s.graphBacklinks.filter((b) => b.source_note_id !== id && b.target_note_id !== id)
        : s.graphBacklinks,
      trashedNotes: note
        ? [{ ...note, deleted_at: new Date().toISOString() }, ...s.trashedNotes]
        : s.trashedNotes,
      canvasNodes: s.canvasNodes.filter((cn) => cn.note_id !== id),
      canvasEdges: nodeToRemove
        ? s.canvasEdges.filter(
            (e) => e.from_node_id !== nodeToRemove.id && e.to_node_id !== nodeToRemove.id
          )
        : s.canvasEdges,
    }))
    try {
      await notesApi.deleteNote(id)
      // Also remove the canvas_node from DB so it doesn't become an orphan on next load
      if (nodeToRemove) {
        await notesApi.removeNodeFromCanvas(nodeToRemove.id)
      }
      toast('Nota movida a la papelera', 'info')
    } catch (e) {
      set({
        notes: prev,
        trashedNotes: get().trashedNotes.filter((n) => n.id !== id),
        canvasNodes: prevNodes,
        canvasEdges: prevEdges,
      })
      const msg = e instanceof Error ? e.message : 'Error al mover la nota a la papelera'
      toast(msg, 'error')
    }
  },

  duplicateNote: async (noteId, userId) => {
    const note = get().notes.find((n) => n.id === noteId)
    if (!note) return
    try {
      const newNote = await notesApi.duplicateNote(userId, note)
      set((s) => ({ notes: [newNote, ...s.notes] }))
      toast('Nota duplicada', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al duplicar la nota'
      toast(msg, 'error')
    }
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id)
    if (!note) return

    const newPinned = !note.is_pinned
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, is_pinned: newPinned } : n)),
    }))

    try {
      await notesApi.togglePinNote(id, newPinned)
    } catch (e) {
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, is_pinned: !newPinned } : n)),
      }))
      const msg = e instanceof Error ? e.message : 'Error al fijar la nota'
      toast(msg, 'error')
    }
  },

  // ── Hydration ─────────────────────

  setNotes: (notes) => set({
    notes,
    notesOffset: notes.length,
    hasMoreNotes: notes.length === notesApi.NOTES_PAGE_SIZE,
  }),

  // ── Filters ────────────────────────

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveTag: (tag) => set({ activeTag: tag }),
  setViewMode: (mode) => {
    set({ viewMode: mode })
    try { localStorage.setItem('arkhos:notes:viewMode', mode) } catch { /* ignore */ }
  },
  setSortMode: (mode) => set({ sortMode: mode }),
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
})
