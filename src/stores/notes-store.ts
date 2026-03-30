// ══════════════════════════════════════
// Arkhos — Notes Store (Zustand)
// Módulo Notas: optimistic updates + rollback + Toast
// Multi-select, sync, resize, inline editing
// ══════════════════════════════════════

import { useMemo } from 'react'
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
  HistoryEntry,
  EdgeSide,
  EdgeColor,
  NoteFolder,
} from '@/types/notes'
import { CANVAS_BOUNDS } from '@/types/notes'
import * as notesApi from '@/lib/supabase/notes'
import { useUIStore } from './ui-store'

// ─── Toast helper ─────────────────────

function toast(message: string, variant: 'success' | 'error' | 'info' = 'info') {
  useUIStore.getState().addToast(message, variant)
}

// ─── Sort modes ──────────────────────

export type NoteSortMode = 'recent' | 'oldest' | 'az' | 'za' | 'color' | 'tag' | 'manual'

// ─── Canvas helpers ──────────────────

function clampNodePosition(x: number, y: number, width: number, height: number) {
  return {
    x: Math.max(CANVAS_BOUNDS.minX, Math.min(x, CANVAS_BOUNDS.maxX - width)),
    y: Math.max(CANVAS_BOUNDS.minY, Math.min(y, CANVAS_BOUNDS.maxY - height)),
  }
}

function getNodesInGroup(groupNode: CanvasNode, allNodes: CanvasNode[]): CanvasNode[] {
  return allNodes.filter(n => {
    if (n.id === groupNode.id) return false
    if (n.node_type === 'group') return false
    const centerX = n.pos_x + (n.width || 200) / 2
    const centerY = n.pos_y + (n.height || 100) / 2
    return (
      centerX >= groupNode.pos_x &&
      centerX <= groupNode.pos_x + (groupNode.width || 400) &&
      centerY >= groupNode.pos_y &&
      centerY <= groupNode.pos_y + (groupNode.height || 300)
    )
  })
}

// ─── Store interface ──────────────────

interface NotesState {
  // List view
  notes: Note[]
  isLoading: boolean
  searchQuery: string
  activeTag: string | null
  viewMode: 'list' | 'canvas'
  sortMode: NoteSortMode

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

  // Undo/redo
  history: HistoryEntry[]
  historyIndex: number

  // Clipboard
  clipboard: { nodes: CanvasNode[]; edges: CanvasEdge[] } | null

  // Canvas search
  canvasSearchQuery: string

  // Folders
  folders: NoteFolder[]
  activeFolderId: string | null  // null = todas, 'archived' = archivo, 'favorites' = favoritas, 'no-folder' = sin carpeta

  // Note multi-select (list view)
  selectedNoteIds: Set<string>
  isSelectionMode: boolean
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
  setSortMode: (mode: NoteSortMode) => void

  // Canvas node operations (optimistic)
  addNoteToCanvas: (noteId: string, pos: { x: number; y: number }) => Promise<CanvasNode | null>
  addTextNode: (content: string, pos: { x: number; y: number }) => Promise<CanvasNode | null>
  addUrlNode: (url: string, pos: { x: number; y: number }) => Promise<CanvasNode | null>
  addGroupNode: (label: string, pos: { x: number; y: number }, size: { width: number; height: number }) => Promise<CanvasNode | null>
  addImageNode: (imageUrl: string, pos: { x: number; y: number }, dimensions?: { width: number; height: number }) => Promise<CanvasNode | null>
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
  addEdge: (fromNodeId: string, toNodeId: string, fromSide?: EdgeSide, toSide?: EdgeSide, color?: EdgeColor, label?: string) => Promise<CanvasEdge | null>
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

  // Undo/Redo
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // Clipboard
  copySelectedNodes: () => void
  pasteNodes: () => Promise<void>

  // Duplicate
  duplicateSelectedNodes: () => Promise<void>

  // Canvas search
  setCanvasSearch: (query: string) => void

  // Group selected nodes
  groupSelectedNodes: () => Promise<void>

  // Auto-layout
  autoLayoutNodes: () => void

  // Folders
  fetchFolders: (userId: string) => Promise<void>
  addFolder: (userId: string, data: Pick<NoteFolder, 'name' | 'icon' | 'color'>) => Promise<void>
  editFolder: (id: string, data: Partial<Pick<NoteFolder, 'name' | 'icon' | 'color'>>) => Promise<void>
  removeFolder: (id: string) => Promise<void>
  moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>
  setActiveFolderId: (id: string | null) => void

  // Archive
  archiveNote: (noteId: string) => Promise<void>
  unarchiveNote: (noteId: string) => Promise<void>

  // Favorites
  toggleFavorite: (noteId: string) => Promise<void>

  // Note multi-select
  toggleNoteSelection: (noteId: string) => void
  selectAllNotes: () => void
  clearSelection: () => void
  setSelectionMode: (v: boolean) => void
  bulkArchive: () => Promise<void>
  bulkDelete: () => Promise<void>
  bulkMove: (folderId: string | null) => Promise<void>
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
  sortMode: 'recent' as NoteSortMode,
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
  history: [],
  historyIndex: -1,
  clipboard: null,
  canvasSearchQuery: '',
  folders: [],
  activeFolderId: null,
  selectedNoteIds: new Set<string>(),
  isSelectionMode: false,

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

      // Auto-fix nodes outside bounds
      const fixedNodes = nodes.map(n => {
        const clamped = clampNodePosition(n.pos_x, n.pos_y, n.width || 200, n.height || 100)
        if (clamped.x !== n.pos_x || clamped.y !== n.pos_y) {
          return { ...n, pos_x: clamped.x, pos_y: clamped.y }
        }
        return n
      })

      // Persist corrected positions for nodes that were out of bounds
      const corrections = fixedNodes
        .filter((n, i) => n.pos_x !== nodes[i].pos_x || n.pos_y !== nodes[i].pos_y)
        .map(n => ({ id: n.id, pos_x: n.pos_x, pos_y: n.pos_y }))

      if (corrections.length > 0) {
        notesApi.batchUpdateNodePositions(corrections).catch(console.error)
      }

      // Deduplicate note nodes — keep the first occurrence per note_id
      const seenNoteIds = new Set<string>()
      const deduped = fixedNodes.filter(n => {
        if (!n.note_id) return true
        if (seenNoteIds.has(n.note_id)) return false
        seenNoteIds.add(n.note_id)
        return true
      })
      const duplicateIds = fixedNodes
        .filter(n => n.note_id && !deduped.includes(n))
        .map(n => n.id)
      if (duplicateIds.length > 0) {
        notesApi.batchRemoveNodes(duplicateIds).catch(console.error)
      }

      set({ canvas, canvasNodes: deduped, canvasEdges: edges })
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
  setSortMode: (mode) => set({ sortMode: mode }),

  // ── Canvas Node Operations ─────────

  addNoteToCanvas: async (noteId, pos) => {
    const { canvas } = get()
    if (!canvas) return null
    get().pushHistory()

    // Check if already on canvas (client-side)
    const existing = get().canvasNodes.find((cn) => cn.note_id === noteId)
    if (existing) {
      toast('Esta nota ya está en el canvas', 'info')
      return existing
    }

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
    get().pushHistory()

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
    get().pushHistory()

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
    get().pushHistory()

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

  addImageNode: async (imageUrl, pos, dimensions) => {
    const { canvas } = get()
    if (!canvas) return null
    get().pushHistory()

    try {
      const node = await notesApi.addImageNodeToCanvas(canvas.id, imageUrl, pos, dimensions)
      set((s) => ({ canvasNodes: [...s.canvasNodes, node] }))
      return node
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear nodo de imagen'
      toast(msg, 'error')
      return null
    }
  },

  updateNodePos: (id, pos) => {
    const node = get().canvasNodes.find(n => n.id === id)
    const clamped = clampNodePosition(pos.x, pos.y, node?.width || 200, node?.height || 100)
    set((s) => ({
      canvasNodes: s.canvasNodes.map((n) =>
        n.id === id ? { ...n, pos_x: clamped.x, pos_y: clamped.y } : n
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
    get().pushHistory()
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
    get().pushHistory()

    const prevNodes = get().canvasNodes
    const prevEdges = get().canvasEdges

    // Also remove children of selected groups
    const selectedGroupIds = new Set(
      prevNodes
        .filter((n) => ids.includes(n.id) && n.node_type === 'group')
        .map((n) => n.id)
    )
    const idsToRemove = new Set(ids)
    if (selectedGroupIds.size > 0) {
      for (const node of prevNodes) {
        if (node.group_id && selectedGroupIds.has(node.group_id) && !idsToRemove.has(node.id)) {
          idsToRemove.add(node.id)
        }
      }
    }

    set((s) => ({
      canvasNodes: s.canvasNodes.filter((n) => !idsToRemove.has(n.id)),
      canvasEdges: s.canvasEdges.filter(
        (e) => !idsToRemove.has(e.from_node_id) && !idsToRemove.has(e.to_node_id)
      ),
      selectedNodeIds: new Set<string>(),
      editingNodeId: null,
    }))

    try {
      await notesApi.batchRemoveNodes(Array.from(idsToRemove))
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

    // Collect group nodes that are selected
    const selectedGroups = canvasNodes.filter(
      (n) => selectedNodeIds.has(n.id) && n.node_type === 'group'
    )

    // Find nodes contained within selected groups (spatial containment)
    const containedNodeIds = new Set<string>()
    for (const group of selectedGroups) {
      const contained = getNodesInGroup(group, canvasNodes)
      for (const cn of contained) {
        if (!selectedNodeIds.has(cn.id)) {
          containedNodeIds.add(cn.id)
        }
      }
    }

    // Also include children via group_id (legacy)
    const selectedGroupIds = new Set(selectedGroups.map((n) => n.id))
    if (selectedGroupIds.size > 0) {
      for (const node of canvasNodes) {
        if (node.group_id && selectedGroupIds.has(node.group_id) && !selectedNodeIds.has(node.id)) {
          containedNodeIds.add(node.id)
        }
      }
    }

    // Merge: all IDs that need to move
    const idsToMove = new Set(selectedNodeIds)
    for (const cid of containedNodeIds) {
      idsToMove.add(cid)
    }

    set({
      canvasNodes: canvasNodes.map((n) => {
        if (!idsToMove.has(n.id) || n.locked) return n
        const clamped = clampNodePosition(
          n.pos_x + deltaX,
          n.pos_y + deltaY,
          n.width || 200,
          n.height || 100
        )
        return { ...n, pos_x: clamped.x, pos_y: clamped.y }
      }),
    })
  },

  persistSelectedNodePositions: async () => {
    const { selectedNodeIds, canvasNodes } = get()

    // Include children of selected groups (both spatial and group_id)
    const selectedGroups = canvasNodes.filter(
      (n) => selectedNodeIds.has(n.id) && n.node_type === 'group'
    )
    const selectedGroupIds = new Set(selectedGroups.map((n) => n.id))

    const idsToPersist = new Set(selectedNodeIds)

    // Spatial containment
    for (const group of selectedGroups) {
      const contained = getNodesInGroup(group, canvasNodes)
      for (const cn of contained) {
        idsToPersist.add(cn.id)
      }
    }

    // Legacy group_id
    if (selectedGroupIds.size > 0) {
      for (const node of canvasNodes) {
        if (node.group_id && selectedGroupIds.has(node.group_id) && !idsToPersist.has(node.id)) {
          idsToPersist.add(node.id)
        }
      }
    }

    const updates = canvasNodes
      .filter((n) => idsToPersist.has(n.id))
      .map((n) => ({ id: n.id, pos_x: n.pos_x, pos_y: n.pos_y }))

    try {
      await notesApi.batchUpdateNodePositions(updates)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar posiciones'
      toast(msg, 'error')
    }
  },

  // ── Canvas Edge Operations ─────────

  addEdge: async (fromNodeId, toNodeId, fromSide: EdgeSide = 'right', toSide: EdgeSide = 'left', color: EdgeColor = 'default', label) => {
    const { canvas } = get()
    if (!canvas) return null
    get().pushHistory()

    // Prevent duplicate edges
    const existing = get().canvasEdges.find(
      (e) =>
        (e.from_node_id === fromNodeId && e.to_node_id === toNodeId) ||
        (e.from_node_id === toNodeId && e.to_node_id === fromNodeId)
    )
    if (existing) return existing

    try {
      const edge = await notesApi.createEdge(canvas.id, fromNodeId, toNodeId, label, fromSide, toSide, color)
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
    get().pushHistory()
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
    const { selectedNodeIds } = get()
    if (additive) {
      // Toggle: add or remove from selection
      const next = new Set(selectedNodeIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      set({ selectedNodeIds: next, selectedEdgeId: null })
    } else {
      // If already selected (multi-select group), keep selection for group drag
      if (selectedNodeIds.has(id) && selectedNodeIds.size > 1) return
      // Otherwise, select ONLY this node
      set({ selectedNodeIds: new Set([id]), selectedEdgeId: null, editingNodeId: null })
    }
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

  // ── Undo/Redo ───────────────────

  pushHistory: () => {
    const { canvasNodes, canvasEdges, history, historyIndex } = get()
    const entry: HistoryEntry = { nodes: [...canvasNodes], edges: [...canvasEdges] }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(entry)
    if (newHistory.length > 50) newHistory.shift()
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const prev = history[historyIndex - 1]
    set({
      canvasNodes: [...prev.nodes],
      canvasEdges: [...prev.edges],
      historyIndex: historyIndex - 1,
      selectedNodeIds: new Set<string>(),
      selectedEdgeId: null,
    })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    set({
      canvasNodes: [...next.nodes],
      canvasEdges: [...next.edges],
      historyIndex: historyIndex + 1,
      selectedNodeIds: new Set<string>(),
      selectedEdgeId: null,
    })
  },

  // ── Clipboard ───────────────────

  copySelectedNodes: () => {
    const { selectedNodeIds, canvasNodes, canvasEdges } = get()
    if (selectedNodeIds.size === 0) return
    const selectedNodes = canvasNodes.filter((n) => selectedNodeIds.has(n.id))
    const nodeIdSet = new Set(selectedNodes.map((n) => n.id))
    const relevantEdges = canvasEdges.filter(
      (e) => nodeIdSet.has(e.from_node_id) && nodeIdSet.has(e.to_node_id)
    )
    set({ clipboard: { nodes: [...selectedNodes], edges: [...relevantEdges] } })
    toast('Nodos copiados', 'success')
  },

  pasteNodes: async () => {
    const { clipboard, canvas } = get()
    if (!clipboard || !canvas || clipboard.nodes.length === 0) return

    // Save history before paste
    get().pushHistory()

    const idMap = new Map<string, string>()
    const newNodes: CanvasNode[] = []

    for (const origNode of clipboard.nodes) {
      const newId = crypto.randomUUID()
      idMap.set(origNode.id, newId)
      const newNode: CanvasNode = {
        ...origNode,
        id: newId,
        canvas_id: canvas.id,
        pos_x: origNode.pos_x + 30,
        pos_y: origNode.pos_y + 30,
        note_id: null,
        note: undefined,
        node_type: origNode.node_type === 'note' ? 'text' : origNode.node_type,
        content: origNode.node_type === 'note' ? (origNode.note?.content ?? origNode.content) : origNode.content,
        label: origNode.node_type === 'note' ? (origNode.note?.title ?? origNode.label) : origNode.label,
      }
      newNodes.push(newNode)
    }

    const newEdges: CanvasEdge[] = clipboard.edges
      .filter((e) => idMap.has(e.from_node_id) && idMap.has(e.to_node_id))
      .map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        canvas_id: canvas.id,
        from_node_id: idMap.get(e.from_node_id)!,
        to_node_id: idMap.get(e.to_node_id)!,
      }))

    // Optimistic update
    set((s) => ({
      canvasNodes: [...s.canvasNodes, ...newNodes],
      canvasEdges: [...s.canvasEdges, ...newEdges],
      selectedNodeIds: new Set(newNodes.map((n) => n.id)),
    }))

    // Persist to DB
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const nodeInserts = newNodes.map((n) => ({
        id: n.id,
        canvas_id: n.canvas_id,
        note_id: n.note_id,
        node_type: n.node_type,
        pos_x: n.pos_x,
        pos_y: n.pos_y,
        width: n.width,
        height: n.height,
        content: n.content,
        url: n.url,
        label: n.label,
        color: n.color,
        z_index: n.z_index,
      }))
      await supabase.from('canvas_nodes').insert(nodeInserts)

      if (newEdges.length > 0) {
        const edgeInserts = newEdges.map((e) => ({
          id: e.id,
          canvas_id: e.canvas_id,
          from_node_id: e.from_node_id,
          to_node_id: e.to_node_id,
          label: e.label,
          color: e.color,
          from_side: e.from_side,
          to_side: e.to_side,
        }))
        await supabase.from('canvas_edges').insert(edgeInserts)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al pegar nodos'
      toast(msg, 'error')
    }
  },

  // ── Duplicate ───────────────────

  duplicateSelectedNodes: async () => {
    get().copySelectedNodes()
    await get().pasteNodes()
  },

  // ── Canvas search ────────────────

  setCanvasSearch: (query) => set({ canvasSearchQuery: query }),

  // ── Group selected nodes ─────────

  groupSelectedNodes: async () => {
    const { selectedNodeIds, canvasNodes, canvas } = get()
    if (!canvas || selectedNodeIds.size < 2) return

    const selectedNodes = canvasNodes.filter(n => selectedNodeIds.has(n.id))
    if (selectedNodes.length < 2) return

    // Calculate bounding box with padding
    const padding = 20
    const headerPadding = 40
    const minX = Math.min(...selectedNodes.map(n => n.pos_x)) - padding
    const minY = Math.min(...selectedNodes.map(n => n.pos_y)) - headerPadding
    const maxX = Math.max(...selectedNodes.map(n => n.pos_x + (n.width || 200))) + padding
    const maxY = Math.max(...selectedNodes.map(n => n.pos_y + (n.height || 100))) + padding

    // Use the existing addGroupNode action
    get().pushHistory()
    await get().addGroupNode(
      `Grupo (${selectedNodes.length} nodos)`,
      { x: minX, y: minY },
      { width: maxX - minX, height: maxY - minY }
    )
  },

  // ── Auto-layout ──────────────────

  autoLayoutNodes: () => {
    const { canvasNodes, canvas } = get()
    if (!canvas || canvasNodes.length === 0) return

    get().pushHistory()

    // Separate groups from other nodes
    const nonGroups = canvasNodes.filter(n => n.node_type !== 'group')

    // Sort by created_at
    const sorted = [...nonGroups].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Grid layout: 4 columns
    const cols = 4
    const nodeW = 280
    const nodeH = 160
    const gapX = 40
    const gapY = 40
    const startX = 60
    const startY = 60

    const updatedNodes = canvasNodes.map(node => {
      if (node.node_type === 'group') return node // handle groups separately
      const idx = sorted.indexOf(node)
      if (idx === -1) return node
      const col = idx % cols
      const row = Math.floor(idx / cols)
      return {
        ...node,
        pos_x: startX + col * (nodeW + gapX),
        pos_y: startY + row * (nodeH + gapY),
      }
    })

    set({ canvasNodes: updatedNodes })

    // Persist all positions
    const updates = updatedNodes
      .filter(n => n.node_type !== 'group')
      .map(n => ({ id: n.id, pos_x: n.pos_x, pos_y: n.pos_y }))

    notesApi.batchUpdateNodePositions(updates).catch(console.error)
  },

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

  setActiveFolderId: (id) => set({ activeFolderId: id }),

  // ── Archive ───────────────────────

  archiveNote: async (noteId) => {
    const prev = get().notes
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, archived: true } : n)),
    }))
    try {
      await notesApi.archiveNote(noteId, true)
      toast('Nota archivada', 'success')
    } catch (e) {
      set({ notes: prev })
      const msg = e instanceof Error ? e.message : 'Error al archivar la nota'
      toast(msg, 'error')
    }
  },

  unarchiveNote: async (noteId) => {
    const prev = get().notes
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, archived: false } : n)),
    }))
    try {
      await notesApi.archiveNote(noteId, false)
      toast('Nota restaurada', 'success')
    } catch (e) {
      set({ notes: prev })
      const msg = e instanceof Error ? e.message : 'Error al restaurar la nota'
      toast(msg, 'error')
    }
  },

  // ── Favorites ─────────────────────

  toggleFavorite: async (noteId) => {
    const note = get().notes.find((n) => n.id === noteId)
    if (!note) return
    const newFavorited = !note.favorited
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, favorited: newFavorited } : n)),
    }))
    try {
      await notesApi.toggleFavorite(noteId, newFavorited)
    } catch (e) {
      set((s) => ({
        notes: s.notes.map((n) => (n.id === noteId ? { ...n, favorited: !newFavorited } : n)),
      }))
      const msg = e instanceof Error ? e.message : 'Error al actualizar favorito'
      toast(msg, 'error')
    }
  },

  // ── Note multi-select ─────────────

  toggleNoteSelection: (noteId) => {
    set((s) => {
      const next = new Set(s.selectedNoteIds)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return { selectedNoteIds: next }
    })
  },

  selectAllNotes: () => {
    const { notes, activeFolderId, searchQuery, activeTag } = get()
    // Select all currently visible notes
    let visible = notes.filter((n) => !n.archived)
    if (activeFolderId === 'archived') visible = notes.filter((n) => n.archived)
    else if (activeFolderId === 'favorites') visible = notes.filter((n) => n.favorited && !n.archived)
    else if (activeFolderId === 'no-folder') visible = notes.filter((n) => !n.folder_id && !n.archived)
    else if (activeFolderId) visible = notes.filter((n) => n.folder_id === activeFolderId && !n.archived)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      visible = visible.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (activeTag) visible = visible.filter((n) => n.tags.includes(activeTag))
    set({ selectedNoteIds: new Set(visible.map((n) => n.id)) })
  },

  clearSelection: () => set({ selectedNoteIds: new Set<string>(), isSelectionMode: false }),

  setSelectionMode: (v) => {
    set({ isSelectionMode: v })
    if (!v) set({ selectedNoteIds: new Set<string>() })
  },

  bulkArchive: async () => {
    const { selectedNoteIds } = get()
    if (selectedNoteIds.size === 0) return
    const ids = Array.from(selectedNoteIds)
    const prev = get().notes
    set((s) => ({
      notes: s.notes.map((n) => (ids.includes(n.id) ? { ...n, archived: true } : n)),
      selectedNoteIds: new Set<string>(),
      isSelectionMode: false,
    }))
    try {
      await Promise.all(ids.map((id) => notesApi.archiveNote(id, true)))
      toast(`${ids.length} nota${ids.length !== 1 ? 's' : ''} archivada${ids.length !== 1 ? 's' : ''}`, 'success')
    } catch (e) {
      set({ notes: prev })
      const msg = e instanceof Error ? e.message : 'Error al archivar las notas'
      toast(msg, 'error')
    }
  },

  bulkDelete: async () => {
    const { selectedNoteIds } = get()
    if (selectedNoteIds.size === 0) return
    const ids = Array.from(selectedNoteIds)
    const prev = get().notes
    const prevNodes = get().canvasNodes
    const prevEdges = get().canvasEdges
    set((s) => ({
      notes: s.notes.filter((n) => !ids.includes(n.id)),
      canvasNodes: s.canvasNodes.filter((cn) => !cn.note_id || !ids.includes(cn.note_id)),
      canvasEdges: s.canvasEdges.filter((e) => {
        const removedNodeIds = new Set(
          prevNodes.filter((cn) => cn.note_id && ids.includes(cn.note_id)).map((cn) => cn.id)
        )
        return !removedNodeIds.has(e.from_node_id) && !removedNodeIds.has(e.to_node_id)
      }),
      selectedNoteIds: new Set<string>(),
      isSelectionMode: false,
    }))
    try {
      await Promise.all(ids.map((id) => notesApi.deleteNote(id)))
      toast(`${ids.length} nota${ids.length !== 1 ? 's' : ''} eliminada${ids.length !== 1 ? 's' : ''}`, 'success')
    } catch (e) {
      set({ notes: prev, canvasNodes: prevNodes, canvasEdges: prevEdges })
      const msg = e instanceof Error ? e.message : 'Error al eliminar las notas'
      toast(msg, 'error')
    }
  },

  bulkMove: async (folderId) => {
    const { selectedNoteIds } = get()
    if (selectedNoteIds.size === 0) return
    const ids = Array.from(selectedNoteIds)
    const prev = get().notes
    set((s) => ({
      notes: s.notes.map((n) => (ids.includes(n.id) ? { ...n, folder_id: folderId } : n)),
      selectedNoteIds: new Set<string>(),
      isSelectionMode: false,
    }))
    try {
      await Promise.all(ids.map((id) => notesApi.moveNoteToFolder(id, folderId)))
      toast(`${ids.length} nota${ids.length !== 1 ? 's' : ''} movida${ids.length !== 1 ? 's' : ''}`, 'success')
    } catch (e) {
      set({ notes: prev })
      const msg = e instanceof Error ? e.message : 'Error al mover las notas'
      toast(msg, 'error')
    }
  },
}))

// ══════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════

/**
 * Notas filtradas por searchQuery + activeTag.
 * Pinned primero, luego por el modo de orden seleccionado.
 */
export function useFilteredNotes(): Note[] {
  const notes = useNotesStore((s) => s.notes)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const activeTag = useNotesStore((s) => s.activeTag)
  const sortMode = useNotesStore((s) => s.sortMode)
  const activeFolderId = useNotesStore((s) => s.activeFolderId)

  let result: Note[]

  // Filter by folder/view
  if (activeFolderId === 'archived') {
    result = notes.filter((n) => n.archived)
  } else if (activeFolderId === 'favorites') {
    result = notes.filter((n) => n.favorited && !n.archived)
  } else if (activeFolderId === 'no-folder') {
    result = notes.filter((n) => !n.folder_id && !n.archived)
  } else if (activeFolderId) {
    result = notes.filter((n) => n.folder_id === activeFolderId && !n.archived)
  } else {
    // null = all non-archived
    result = notes.filter((n) => !n.archived)
  }

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
    // Pinned notes always first
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1

    switch (sortMode) {
      case 'oldest':
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      case 'az':
        return a.title.localeCompare(b.title, 'es')
      case 'za':
        return b.title.localeCompare(a.title, 'es')
      case 'color':
        return (a.color || 'default').localeCompare(b.color || 'default')
      case 'tag': {
        const aTag = a.tags.length > 0 ? a.tags[0] : '\uffff'
        const bTag = b.tags.length > 0 ? b.tags[0] : '\uffff'
        return aTag.localeCompare(bTag, 'es')
      }
      case 'manual':
        // sort_order ASC, fallback to updated_at DESC for notes without sort_order
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      case 'recent':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })

  return result
}

/**
 * Canvas search: returns matching node IDs for the current search query.
 */
export function useCanvasSearchResults(): { matchingIds: Set<string> | null; query: string } {
  const query = useNotesStore(state => state.canvasSearchQuery)
  const canvasNodes = useNotesStore(state => state.canvasNodes)

  return useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return { matchingIds: null, query: '' }
    const matchingIds = new Set<string>()
    for (const node of canvasNodes) {
      const title = node.note?.title || node.label || ''
      const content = node.note?.content || node.content || ''
      const url = node.url || ''
      if (title.toLowerCase().includes(q) || content.toLowerCase().includes(q) || url.toLowerCase().includes(q)) {
        matchingIds.add(node.id)
      }
    }
    return { matchingIds, query: q }
  }, [query, canvasNodes])
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
