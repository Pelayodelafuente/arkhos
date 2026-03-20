// ══════════════════════════════════════
// Arkhos — Notes Store (Zustand)
// Módulo Notas: optimistic updates + rollback + Toast
// Multi-select, sync, resize, inline editing
// ══════════════════════════════════════

import { create } from 'zustand'
import type {
  Note,
  NoteCanvas,
  CanvasNode,
  CanvasEdge,
  NoteFormData,
  CanvasViewport,
  RubberBand,
  SnapGuide,
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
  viewport: CanvasViewport

  // Selection (multi-select)
  selectedNodeIds: Set<string>
  selectedEdgeId: string | null

  // Connection drag
  connectingFromNodeId: string | null

  // Rubber band selection
  rubberBand: RubberBand | null

  // Snap
  snapEnabled: boolean
  snapGuides: SnapGuide[]

  // Inline editing
  editingNodeId: string | null

  // Resize
  resizingNodeId: string | null
}

interface NotesActions {
  // Data fetching
  fetchNotes: (userId: string) => Promise<void>
  fetchCanvas: (canvasId: string) => Promise<void>
  initCanvas: (userId: string) => Promise<void>

  // Sync notes ↔ canvas_nodes
  syncNotesToCanvas: (userId: string) => Promise<void>

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
  addGroupNode: (label: string, pos: { x: number; y: number }, size: { width: number; height: number }) => Promise<CanvasNode | null>
  updateNodePos: (id: string, pos: { x: number; y: number }) => void
  persistNodePos: (id: string, pos: { x: number; y: number }) => Promise<void>
  updateNodeSize: (id: string, size: { width: number; height: number }) => Promise<void>
  updateNodeContent: (id: string, content: string) => Promise<void>
  toggleNodeLocked: (id: string) => Promise<void>
  removeNode: (id: string) => Promise<void>
  removeSelectedNodes: () => Promise<void>

  // Multi-select group drag
  moveSelectedNodes: (deltaX: number, deltaY: number) => void
  persistSelectedNodePositions: () => Promise<void>

  // Canvas edge operations
  addEdge: (fromNodeId: string, toNodeId: string, label?: string) => Promise<CanvasEdge | null>
  editEdge: (id: string, data: Partial<Pick<CanvasEdge, 'label' | 'color'>>) => Promise<void>
  removeEdge: (id: string) => Promise<void>

  // Selection
  selectNode: (id: string, additive?: boolean) => void
  deselectAll: () => void
  selectNodesInRect: (rect: { x: number; y: number; width: number; height: number }) => void
  setSelectedEdge: (id: string | null) => void

  // Rubber band
  setRubberBand: (rb: RubberBand | null) => void

  // Connection
  setConnectingFrom: (id: string | null) => void

  // Snap
  toggleSnap: () => void
  setSnapGuides: (guides: SnapGuide[]) => void

  // Inline editing
  setEditingNode: (id: string | null) => void

  // Resize
  setResizingNode: (id: string | null) => void

  // Viewport
  setViewport: (vp: Partial<CanvasViewport>) => void
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
  viewport: { offsetX: 0, offsetY: 0, scale: 1 },
  selectedNodeIds: new Set<string>(),
  selectedEdgeId: null,
  connectingFromNodeId: null,
  rubberBand: null,
  snapEnabled: true,
  snapGuides: [],
  editingNodeId: null,
  resizingNodeId: null,

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

  // ── Sync ────────────────────────────

  syncNotesToCanvas: async (userId) => {
    const { canvas, canvasNodes } = get()
    if (!canvas) return

    try {
      const newNodes = await notesApi.syncNotesToCanvas(canvas.id, userId, canvasNodes)
      if (newNodes.length > 0) {
        set((s) => ({ canvasNodes: [...s.canvasNodes, ...newNodes] }))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al sincronizar notas'
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
    const prevEdges = get().canvasEdges
    // Find canvas node for this note to also remove its edges
    const nodeToRemove = prevNodes.find((cn) => cn.note_id === id)
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      canvasNodes: s.canvasNodes.filter((cn) => cn.note_id !== id),
      canvasEdges: nodeToRemove
        ? s.canvasEdges.filter(
            (e) => e.from_node_id !== nodeToRemove.id && e.to_node_id !== nodeToRemove.id
          )
        : s.canvasEdges,
    }))

    try {
      await notesApi.deleteNote(id)
      toast('Nota eliminada', 'success')
    } catch (e) {
      set({ notes: prev, canvasNodes: prevNodes, canvasEdges: prevEdges })
      const msg = e instanceof Error ? e.message : 'Error al eliminar la nota'
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

    // Check if already on canvas (client-side)
    const existing = get().canvasNodes.find((cn) => cn.note_id === noteId)
    if (existing) return existing

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

  addGroupNode: async (label, pos, size) => {
    const { canvas } = get()
    if (!canvas) return null

    try {
      const node = await notesApi.addGroupNodeToCanvas(canvas.id, label, pos, size)
      set((s) => ({ canvasNodes: [...s.canvasNodes, node] }))
      return node
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear grupo'
      toast(msg, 'error')
      return null
    }
  },

  updateNodePos: (id, pos) => {
    set((s) => ({
      canvasNodes: s.canvasNodes.map((n) =>
        n.id === id ? { ...n, pos_x: pos.x, pos_y: pos.y } : n
      ),
    }))
  },

  persistNodePos: async (id, pos) => {
    try {
      await notesApi.updateNodePosition(id, pos)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar posición'
      toast(msg, 'error')
    }
  },

  updateNodeSize: async (id, size) => {
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

  updateNodeContent: async (id, content) => {
    set((s) => ({
      canvasNodes: s.canvasNodes.map((n) =>
        n.id === id ? { ...n, content } : n
      ),
    }))

    try {
      await notesApi.updateNodeContent(id, content)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar contenido'
      toast(msg, 'error')
    }
  },

  toggleNodeLocked: async (id) => {
    const node = get().canvasNodes.find((n) => n.id === id)
    if (!node) return
    const newLocked = !node.locked
    set((s) => ({
      canvasNodes: s.canvasNodes.map((n) =>
        n.id === id ? { ...n, locked: newLocked } : n
      ),
    }))
    try {
      await notesApi.updateNodeLocked(id, newLocked)
    } catch (e) {
      set((s) => ({
        canvasNodes: s.canvasNodes.map((n) =>
          n.id === id ? { ...n, locked: !newLocked } : n
        ),
      }))
      const msg = e instanceof Error ? e.message : 'Error al bloquear nodo'
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
      selectedNodeIds: (() => {
        const next = new Set(s.selectedNodeIds)
        next.delete(id)
        return next
      })(),
      editingNodeId: s.editingNodeId === id ? null : s.editingNodeId,
    }))

    try {
      await notesApi.removeNodeFromCanvas(id)
    } catch (e) {
      set({ canvasNodes: prevNodes, canvasEdges: prevEdges })
      const msg = e instanceof Error ? e.message : 'Error al eliminar nodo'
      toast(msg, 'error')
    }
  },

  removeSelectedNodes: async () => {
    const ids = Array.from(get().selectedNodeIds)
    if (ids.length === 0) return

    const prevNodes = get().canvasNodes
    const prevEdges = get().canvasEdges
    const idSet = new Set(ids)

    set((s) => ({
      canvasNodes: s.canvasNodes.filter((n) => !idSet.has(n.id)),
      canvasEdges: s.canvasEdges.filter(
        (e) => !idSet.has(e.from_node_id) && !idSet.has(e.to_node_id)
      ),
      selectedNodeIds: new Set<string>(),
      editingNodeId: null,
    }))

    try {
      await notesApi.batchRemoveNodes(ids)
    } catch (e) {
      set({ canvasNodes: prevNodes, canvasEdges: prevEdges })
      const msg = e instanceof Error ? e.message : 'Error al eliminar nodos'
      toast(msg, 'error')
    }
  },

  // ── Multi-select group drag ────────

  moveSelectedNodes: (deltaX, deltaY) => {
    const { selectedNodeIds, canvasNodes } = get()
    if (selectedNodeIds.size === 0) return
    set({
      canvasNodes: canvasNodes.map((n) =>
        selectedNodeIds.has(n.id) && !n.locked
          ? { ...n, pos_x: n.pos_x + deltaX, pos_y: n.pos_y + deltaY }
          : n
      ),
    })
  },

  persistSelectedNodePositions: async () => {
    const { selectedNodeIds, canvasNodes } = get()
    const updates = canvasNodes
      .filter((n) => selectedNodeIds.has(n.id))
      .map((n) => ({ id: n.id, pos_x: n.pos_x, pos_y: n.pos_y }))

    try {
      await notesApi.batchUpdateNodePositions(updates)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar posiciones'
      toast(msg, 'error')
    }
  },

  // ── Canvas Edge Operations ─────────

  addEdge: async (fromNodeId, toNodeId, label) => {
    const { canvas } = get()
    if (!canvas) return null

    // Prevent duplicate edges
    const existing = get().canvasEdges.find(
      (e) =>
        (e.from_node_id === fromNodeId && e.to_node_id === toNodeId) ||
        (e.from_node_id === toNodeId && e.to_node_id === fromNodeId)
    )
    if (existing) return existing

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

    set((s) => ({
      canvasEdges: s.canvasEdges.map((e) => (e.id === id ? { ...e, ...data } : e)),
    }))

    try {
      await notesApi.updateEdge(id, data)
    } catch (e) {
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

  // ── Selection ──────────────────────

  selectNode: (id, additive = false) => {
    set((s) => {
      const next = additive ? new Set(s.selectedNodeIds) : new Set<string>()
      if (additive && next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedNodeIds: next, selectedEdgeId: null }
    })
  },

  deselectAll: () => set({
    selectedNodeIds: new Set<string>(),
    selectedEdgeId: null,
    editingNodeId: null,
  }),

  selectNodesInRect: (rect) => {
    const { canvasNodes } = get()
    const selected = new Set<string>()
    for (const node of canvasNodes) {
      const nodeRight = node.pos_x + node.width
      const nodeBottom = node.pos_y + node.height
      const rectRight = rect.x + rect.width
      const rectBottom = rect.y + rect.height

      // Check overlap
      if (
        node.pos_x < rectRight &&
        nodeRight > rect.x &&
        node.pos_y < rectBottom &&
        nodeBottom > rect.y
      ) {
        selected.add(node.id)
      }
    }
    set({ selectedNodeIds: selected })
  },

  setSelectedEdge: (id) => set({
    selectedEdgeId: id,
    selectedNodeIds: new Set<string>(),
  }),

  // ── Rubber band ───────────────────

  setRubberBand: (rb) => set({ rubberBand: rb }),

  // ── Connection ────────────────────

  setConnectingFrom: (id) => set({ connectingFromNodeId: id }),

  // ── Snap ──────────────────────────

  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setSnapGuides: (guides) => set({ snapGuides: guides }),

  // ── Inline editing ────────────────

  setEditingNode: (id) => set({ editingNodeId: id }),

  // ── Resize ────────────────────────

  setResizingNode: (id) => set({ resizingNodeId: id }),

  // ── Viewport ──────────────────────

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

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  if (activeTag) {
    result = result.filter((n) => n.tags.includes(activeTag))
  }

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
