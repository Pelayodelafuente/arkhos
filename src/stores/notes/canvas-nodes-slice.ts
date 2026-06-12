// ══════════════════════════════════════
// Arkhos — Notes Store: slice de nodos del canvas
// initCanvas/fetchCanvas/sync (cruzan dominios notas↔canvas: se mantienen
// aquí porque operan sobre canvas/canvasNodes), operaciones de nodos,
// group drag, snap, inline editing, resize, label, color, auto-layout
// ══════════════════════════════════════

import type { StateCreator } from 'zustand'
import * as notesApi from '@/lib/supabase/notes'
import { createClient } from '@/lib/supabase/client'
import { toast, clampNodePosition } from '@/stores/notes/helpers'
import type { NotesStore, CanvasNodesSlice } from '@/stores/notes/types'

export const createCanvasNodesSlice: StateCreator<NotesStore, [], [], CanvasNodesSlice> = (set, get) => ({
  // State
  canvas: null,
  canvasNodes: [],
  snapEnabled: true,
  snapGuides: [],
  editingNodeId: null,
  resizingNodeId: null,

  // ── Fetch ───────────────────────────

  initCanvas: async (userId) => {
    try {
      const canvas = await notesApi.getOrCreateDefaultCanvas(userId)
      set({ canvas })
      await get().fetchCanvas(canvas.id)

      // Restore persisted viewport from localStorage
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('arkhos:canvas:viewport')
          if (raw) {
            const parsed = JSON.parse(raw) as { offsetX?: number; offsetY?: number; scale?: number }
            if (
              typeof parsed.offsetX === 'number' &&
              typeof parsed.offsetY === 'number' &&
              typeof parsed.scale === 'number' &&
              parsed.scale > 0
            ) {
              set({ viewport: { offsetX: parsed.offsetX, offsetY: parsed.offsetY, scale: parsed.scale } })
            }
          }
        } catch {
          // Malformed JSON or localStorage unavailable — use default viewport
        }
      }
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
        notesApi.batchUpdateNodePositions(corrections).catch((e: unknown) => { if (process.env.NODE_ENV === 'development') console.error(e) })
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
        notesApi.batchRemoveNodes(duplicateIds).catch((e: unknown) => { if (process.env.NODE_ENV === 'development') console.error(e) })
      }

      // Filter out orphaned note-nodes: note was deleted, archived, or doesn't exist
      const cleanNodes = deduped.filter(n => {
        if (!n.note_id) return true // text, url, image nodes are always valid
        return n.note && !n.note.deleted_at && !n.note.archived
      })
      const orphanIds = deduped
        .filter(n => n.note_id && (!n.note || n.note.deleted_at || n.note.archived))
        .map(n => n.id)
      if (orphanIds.length > 0) {
        notesApi.batchRemoveNodes(orphanIds).catch((e: unknown) => { if (process.env.NODE_ENV === 'development') console.error(e) })
      }

      set({ canvas, canvasNodes: cleanNodes, canvasEdges: edges })
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

  // ── Hydration ─────────────────────

  setCanvas: (canvas) => set({ canvas }),

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
      toast('Nota añadida al canvas', 'success')
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
    const idsToRemove = new Set(ids)

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

    set({
      canvasNodes: canvasNodes.map((n) => {
        if (!selectedNodeIds.has(n.id) || n.locked) return n
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

  // ── Snap ──────────────────────────

  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setSnapGuides: (guides) => set({ snapGuides: guides }),

  // ── Inline editing ────────────────

  setEditingNode: (id) => set({ editingNodeId: id }),

  // ── Resize ────────────────────────

  setResizingNode: (id) => set({ resizingNodeId: id }),

  // ── Auto-layout ──────────────────

  autoLayoutNodes: () => {
    const { canvasNodes, canvas } = get()
    if (!canvas || canvasNodes.length === 0) return

    get().pushHistory()

    // Sort by created_at
    const sorted = [...canvasNodes].sort((a, b) =>
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
      .map(n => ({ id: n.id, pos_x: n.pos_x, pos_y: n.pos_y }))

    notesApi.batchUpdateNodePositions(updates).catch((e: unknown) => { if (process.env.NODE_ENV === 'development') console.error(e) })
  },

  // ── Node label ───────────────────

  updateNodeLabel: async (id, label) => {
    set((s) => ({
      canvasNodes: s.canvasNodes.map((n) => (n.id === id ? { ...n, label } : n)),
    }))
    try {
      await notesApi.updateNodeLabel(id, label)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar nombre'
      toast(msg, 'error')
    }
  },

  // ── Node Color ────────────────────

  updateNodeColor: (id, color) => {
    set((s) => ({
      canvasNodes: s.canvasNodes.map((n) => (n.id === id ? { ...n, color } : n)),
    }))
    const supabase = createClient()
    supabase.from('canvas_nodes').update({ color }).eq('id', id).then(({ error }: { error: { message: string } | null }) => {
      if (error) {
        const msg = error.message ?? 'Error al actualizar color'
        toast(msg, 'error')
      }
    })
  },
})
