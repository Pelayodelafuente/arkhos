// ══════════════════════════════════════
// Arkhos — Notes Store: slice de interacción del canvas
// Edges, selection, rubber band, connection, viewport,
// undo/redo, clipboard, duplicate, canvas search, canvas filters
// ══════════════════════════════════════

import type { StateCreator } from 'zustand'
import type { CanvasNode, CanvasEdge, EdgeSide, EdgeColor, HistoryEntry } from '@/types/notes'
import * as notesApi from '@/lib/supabase/notes'
import { toast } from '@/stores/notes/helpers'
import type { NotesStore, CanvasInteractionSlice } from '@/stores/notes/types'

export const createCanvasInteractionSlice: StateCreator<NotesStore, [], [], CanvasInteractionSlice> = (set, get) => ({
  // State
  canvasEdges: [],
  viewport: { offsetX: 0, offsetY: 0, scale: 1 },
  selectedNodeIds: new Set<string>(),
  selectedEdgeId: null,
  connectingFromNodeId: null,
  rubberBand: null,
  history: [],
  historyIndex: -1,
  clipboard: null,
  canvasSearchQuery: '',
  canvasFilters: { types: [], colors: [] },

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

  // ── Viewport ──────────────────────

  setViewport: (vp) => {
    set((s) => {
      const next = { ...s.viewport, ...vp }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('arkhos:canvas:viewport', JSON.stringify({
            offsetX: next.offsetX,
            offsetY: next.offsetY,
            scale: next.scale,
          }))
        } catch {
          // localStorage may be unavailable (private mode, quota exceeded, etc.)
        }
      }
      return { viewport: next }
    })
  },

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

  // ── Canvas Filters ────────────────

  setCanvasFilters: (f) => set({ canvasFilters: f }),

  clearCanvasFilters: () => set({ canvasFilters: { types: [], colors: [] } }),
})
