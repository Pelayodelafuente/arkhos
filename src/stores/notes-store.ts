// ══════════════════════════════════════
// Arkhos — Notes Store (Zustand)
// Módulo Notas: optimistic updates + rollback + Toast
// ══════════════════════════════════════

import { create } from 'zustand'
import type {
  Note,
  NoteCanvas,
  CanvasNode,
  CanvasEdge,
  NoteFormData,
} from '@/types/notes'
import * as notesApi from '@/lib/supabase/notes'
import { useUIStore } from './ui-store'

// ─── Toast helper ─────────────────────

function toast(message: string, variant: 'success' | 'error') {
  useUIStore.getState().addToast(message, variant)
}

// ─── Store interface ──────────────────

interface NotesState {
  // List view
  notes: Note[]
  isLoading: boolean
  searchQuery: string
  activeTag: string | null
  viewMode: 'list' | 'canvas'

  // Canvas
  canvas: NoteCanvas | null
  canvasNodes: CanvasNode[]
  canvasEdges: CanvasEdge[]
  selectedNodeId: string | null
  connectingFromNodeId: string | null
  viewport: { offsetX: number; offsetY: number; scale: number }
}

interface NotesActions {
  // Data fetching
  fetchNotes: (userId: string) => Promise<void>
  fetchCanvas: (canvasId: string) => Promise<void>
  initCanvas: (userId: string) => Promise<void>

  // Note CRUD (optimistic)
  addNote: (userId: string, data: NoteFormData) => Promise<Note | null>
  editNote: (id: string, data: Partial<NoteFormData>) => Promise<void>
  removeNote: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>

  // Hydration (server → store)
  setNotes: (notes: Note[]) => void
  setCanvas: (canvas: NoteCanvas) => void

  // List filters
  setSearchQuery: (q: string) => void
  setActiveTag: (tag: string | null) => void
  setViewMode: (mode: 'list' | 'canvas') => void

  // Canvas node operations (optimistic)
  addNoteToCanvas: (noteId: string, pos: { x: number; y: number }) => Promise<CanvasNode | null>
  addTextNode: (content: string, pos: { x: number; y: number }) => Promise<CanvasNode | null>
  addUrlNode: (url: string, pos: { x: number; y: number }) => Promise<CanvasNode | null>
  updateNodePos: (id: string, pos: { x: number; y: number }) => void
  persistNodePos: (id: string, pos: { x: number; y: number }) => Promise<void>
  updateNodeSize: (id: string, size: { width: number; height: number }) => Promise<void>
  removeNode: (id: string) => Promise<void>

  // Canvas edge operations
  addEdge: (fromNodeId: string, toNodeId: string, label?: string) => Promise<CanvasEdge | null>
  editEdge: (id: string, data: Partial<Pick<CanvasEdge, 'label' | 'color'>>) => Promise<void>
  removeEdge: (id: string) => Promise<void>

  // Canvas UI state
  setSelectedNode: (id: string | null) => void
  setConnectingFrom: (id: string | null) => void
  setViewport: (vp: Partial<{ offsetX: number; offsetY: number; scale: number }>) => void
}

type NotesStore = NotesState & NotesActions

// ─── Store ────────────────────────────

export const useNotesStore = create<NotesStore>((set, get) => ({
  // State
  notes: [],
  isLoading: false,
  searchQuery: '',
  activeTag: null,
  viewMode: 'list',
  canvas: null,
  canvasNodes: [],
  canvasEdges: [],
  selectedNodeId: null,
  connectingFromNodeId: null,
  viewport: { offsetX: 0, offsetY: 0, scale: 1 },

  // ── Fetch ───────────────────────────

  fetchNotes: async (userId) => {
    set({ isLoading: true })
    try {
      const notes = await notesApi.getNotes(userId)
      set({ notes, isLoading: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar las notas'
      set({ isLoading: false })
      toast(msg, 'error')
    }
  },

  initCanvas: async (userId) => {
    try {
      const canvas = await notesApi.getOrCreateDefaultCanvas(userId)
      set({ canvas })
      await get().fetchCanvas(canvas.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al inicializar el canvas'
      toast(msg, 'error')
    }
  },

  fetchCanvas: async (canvasId) => {
    try {
      const { canvas, nodes, edges } = await notesApi.getCanvasWithNodes(canvasId)
      set({ canvas, canvasNodes: nodes, canvasEdges: edges })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar el canvas'
      toast(msg, 'error')
    }
  },

  // ── Notes CRUD ─────────────────────

  addNote: async (userId, data) => {
    try {
      const note = await notesApi.createNote(userId, data)
      set((s) => ({ notes: [note, ...s.notes] }))
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
    } catch (e) {
      // Rollback
      set((s) => ({ notes: s.notes.map((n) => (n.id === id ? prev : n)) }))
      const msg = e instanceof Error ? e.message : 'Error al guardar la nota'
      toast(msg, 'error')
    }
  },

  removeNote: async (id) => {
    const prev = get().notes
    const prevNodes = get().canvasNodes
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
    // Also remove from canvas nodes
    set((s) => ({ canvasNodes: s.canvasNodes.filter((cn) => cn.note_id !== id) }))

    try {
      await notesApi.deleteNote(id)
      toast('Nota eliminada', 'success')
    } catch (e) {
      set({ notes: prev, canvasNodes: prevNodes })
      const msg = e instanceof Error ? e.message : 'Error al eliminar la nota'
      toast(msg, 'error')
    }
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id)
    if (!note) return

    const newPinned = !note.is_pinned
    // Optimistic
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, is_pinned: newPinned } : n)),
    }))

    try {
      await notesApi.togglePinNote(id, newPinned)
    } catch (e) {
      // Rollback
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? { ...n, is_pinned: !newPinned } : n)),
      }))
      const msg = e instanceof Error ? e.message : 'Error al fijar la nota'
      toast(msg, 'error')
    }
  },

  // ── Hydration ─────────────────────

  setNotes: (notes) => set({ notes }),
  setCanvas: (canvas) => set({ canvas }),

  // ── Filters ────────────────────────

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveTag: (tag) => set({ activeTag: tag }),
  setViewMode: (mode) => set({ viewMode: mode }),

  // ── Canvas Node Operations ─────────

  addNoteToCanvas: async (noteId, pos) => {
    const { canvas } = get()
    if (!canvas) return null

    try {
      const node = await notesApi.addNoteToCanvas(canvas.id, noteId, pos)
      set((s) => ({ canvasNodes: [...s.canvasNodes, node] }))
      return node
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al añadir nota al canvas'
      toast(msg, 'error')
      return null
    }
  },

  addTextNode: async (content, pos) => {
    const { canvas } = get()
    if (!canvas) return null

    try {
      const node = await notesApi.addTextNodeToCanvas(canvas.id, content, pos)
      set((s) => ({ canvasNodes: [...s.canvasNodes, node] }))
      return node
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear nodo de texto'
      toast(msg, 'error')
      return null
    }
  },

  addUrlNode: async (url, pos) => {
    const { canvas } = get()
    if (!canvas) return null

    try {
      const node = await notesApi.addUrlNodeToCanvas(canvas.id, url, pos)
      set((s) => ({ canvasNodes: [...s.canvasNodes, node] }))
      return node
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear nodo URL'
      toast(msg, 'error')
      return null
    }
  },

  // Update node position in store only (during drag, no DB call)
  updateNodePos: (id, pos) => {
    set((s) => ({
      canvasNodes: s.canvasNodes.map((n) =>
        n.id === id ? { ...n, pos_x: pos.x, pos_y: pos.y } : n
      ),
    }))
  },

  // Persist node position to DB (on mouseup)
  persistNodePos: async (id, pos) => {
    try {
      await notesApi.updateNodePosition(id, pos)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar posición'
      toast(msg, 'error')
    }
  },

  updateNodeSize: async (id, size) => {
    // Optimistic
    set((s) => ({
      canvasNodes: s.canvasNodes.map((n) =>
        n.id === id ? { ...n, width: size.width, height: size.height } : n
      ),
    }))

    try {
      await notesApi.updateNodeSize(id, size)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar tamaño'
      toast(msg, 'error')
    }
  },

  removeNode: async (id) => {
    const prevNodes = get().canvasNodes
    const prevEdges = get().canvasEdges
    set((s) => ({
      canvasNodes: s.canvasNodes.filter((n) => n.id !== id),
      canvasEdges: s.canvasEdges.filter(
        (e) => e.from_node_id !== id && e.to_node_id !== id
      ),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }))

    try {
      await notesApi.removeNodeFromCanvas(id)
    } catch (e) {
      set({ canvasNodes: prevNodes, canvasEdges: prevEdges })
      const msg = e instanceof Error ? e.message : 'Error al eliminar nodo'
      toast(msg, 'error')
    }
  },

  // ── Canvas Edge Operations ─────────

  addEdge: async (fromNodeId, toNodeId, label) => {
    const { canvas } = get()
    if (!canvas) return null

    try {
      const edge = await notesApi.createEdge(canvas.id, fromNodeId, toNodeId, label)
      set((s) => ({ canvasEdges: [...s.canvasEdges, edge] }))
      return edge
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear conexión'
      toast(msg, 'error')
      return null
    }
  },

  editEdge: async (id, data) => {
    const prev = get().canvasEdges.find((e) => e.id === id)
    if (!prev) return

    // Optimistic
    set((s) => ({
      canvasEdges: s.canvasEdges.map((e) => (e.id === id ? { ...e, ...data } : e)),
    }))

    try {
      await notesApi.updateEdge(id, data)
    } catch (e) {
      // Rollback
      set((s) => ({
        canvasEdges: s.canvasEdges.map((e) => (e.id === id ? prev : e)),
      }))
      const msg = e instanceof Error ? e.message : 'Error al editar conexión'
      toast(msg, 'error')
    }
  },

  removeEdge: async (id) => {
    const prev = get().canvasEdges
    set((s) => ({ canvasEdges: s.canvasEdges.filter((e) => e.id !== id) }))

    try {
      await notesApi.deleteEdge(id)
    } catch (e) {
      set({ canvasEdges: prev })
      const msg = e instanceof Error ? e.message : 'Error al eliminar conexión'
      toast(msg, 'error')
    }
  },

  // ── Canvas UI State ────────────────

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setConnectingFrom: (id) => set({ connectingFromNodeId: id }),
  setViewport: (vp) => set((s) => ({ viewport: { ...s.viewport, ...vp } })),
}))

// ══════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════

/**
 * Notas filtradas por searchQuery + activeTag.
 * Pinned primero, luego por updated_at descendente.
 */
export function useFilteredNotes(): Note[] {
  const notes = useNotesStore((s) => s.notes)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const activeTag = useNotesStore((s) => s.activeTag)

  let result = [...notes]

  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  // Filter by tag
  if (activeTag) {
    result = result.filter((n) => n.tags.includes(activeTag))
  }

  // Sort: pinned first, then by updated_at
  result.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  return result
}

/**
 * Todas las tags únicas de las notas del usuario.
 */
export function useAllTags(): string[] {
  const notes = useNotesStore((s) => s.notes)
  const tagSet = new Set<string>()
  for (const note of notes) {
    for (const tag of note.tags) {
      tagSet.add(tag)
    }
  }
  return Array.from(tagSet).sort()
}
