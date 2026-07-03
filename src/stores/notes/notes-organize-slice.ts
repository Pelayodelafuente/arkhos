// ══════════════════════════════════════
// Arkhos — Notes Store: slice de organización de notas
// Archive, favoritos, multi-select (list view) + bulk ops,
// backlinks y cross-module links
// Separado de notes-slice para mantener cada archivo <600 líneas
// ══════════════════════════════════════

import type { StateCreator } from 'zustand'
import * as notesApi from '@/lib/supabase/notes'
import { toast } from '@/stores/notes/helpers'
import type { NotesStore, NotesOrganizeSlice } from '@/stores/notes/types'

export const createNotesOrganizeSlice: StateCreator<NotesStore, [], [], NotesOrganizeSlice> = (set, get) => ({
  // State
  selectedNoteIds: new Set<string>(),
  isSelectionMode: false,
  noteReferences: {},
  noteBacklinks: {},

  // ── Archive ───────────────────────

  archiveNote: async (noteId) => {
    const prev = get().notes
    const prevNodes = get().canvasNodes
    const prevEdges = get().canvasEdges
    const nodeToRemove = prevNodes.find((cn) => cn.note_id === noteId)
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, archived: true } : n)),
      // Remove from canvas immediately — archived notes must not appear on canvas
      canvasNodes: s.canvasNodes.filter((cn) => cn.note_id !== noteId),
      canvasEdges: nodeToRemove
        ? s.canvasEdges.filter(
            (e) => e.from_node_id !== nodeToRemove.id && e.to_node_id !== nodeToRemove.id
          )
        : s.canvasEdges,
    }))
    try {
      await notesApi.archiveNote(noteId, true)
      if (nodeToRemove) {
        await notesApi.removeNodeFromCanvas(nodeToRemove.id)
      }
      toast('Nota archivada', 'success')
    } catch (e) {
      set({ notes: prev, canvasNodes: prevNodes, canvasEdges: prevEdges })
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
    // Soft-delete bulk: move to trash
    const { selectedNoteIds, notes } = get()
    if (selectedNoteIds.size === 0) return
    const ids = Array.from(selectedNoteIds)
    const prev = get().notes
    const prevNodes = get().canvasNodes
    const prevEdges = get().canvasEdges
    const now = new Date().toISOString()
    const trashing = notes.filter((n) => ids.includes(n.id)).map((n) => ({ ...n, deleted_at: now }))
    set((s) => ({
      notes: s.notes.filter((n) => !ids.includes(n.id)),
      trashedNotes: [...trashing, ...s.trashedNotes],
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
      toast(`${ids.length} nota${ids.length !== 1 ? 's' : ''} movida${ids.length !== 1 ? 's' : ''} a la papelera`, 'info')
    } catch (e) {
      set({ notes: prev, trashedNotes: get().trashedNotes.filter((n) => !ids.includes(n.id)), canvasNodes: prevNodes, canvasEdges: prevEdges })
      const msg = e instanceof Error ? e.message : 'Error al mover las notas a la papelera'
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

  // ── Backlinks ─────────────────────

  loadNoteLinks: async (noteId) => {
    try {
      const [references, backlinks] = await Promise.all([
        notesApi.getNoteReferences(noteId),
        notesApi.getNoteBacklinks(noteId),
      ])
      set((s) => ({
        noteReferences: { ...s.noteReferences, [noteId]: references },
        noteBacklinks: { ...s.noteBacklinks, [noteId]: backlinks },
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar backlinks'
      toast(msg, 'error')
    }
  },

  syncBacklinksOnSave: async (noteId, content) => {
    const { notes, graphLoaded, graphNotes } = get()
    // Con el grafo cargado, graphNotes tiene TODAS las notas (s.notes está
    // paginado a 30): los [[links]] a notas antiguas también resuelven
    const pool = graphLoaded && graphNotes.length > notes.length ? graphNotes : notes
    const targetIds = notesApi.parseBacklinksFromContent(content, pool)
    await notesApi.syncNoteBacklinks(noteId, targetIds)
    await get().loadNoteLinks(noteId)
    // Espejo optimista del grafo: la arista aparece sin refetch
    if (graphLoaded) {
      set((s) => ({
        graphBacklinks: [
          ...s.graphBacklinks.filter((b) => b.source_note_id !== noteId),
          ...targetIds.map((tid) => ({ source_note_id: noteId, target_note_id: tid })),
        ],
      }))
    }
  },

  generateBacklinkEdges: async () => {
    const { canvasNodes, canvasEdges, noteBacklinks, addEdge } = get()

    // Build map noteId → nodeId
    const noteToNode = new Map<string, string>()
    for (const node of canvasNodes) {
      if (node.note_id) noteToNode.set(node.note_id, node.id)
    }

    for (const [targetNoteId, sourcingNotes] of Object.entries(noteBacklinks)) {
      const targetNodeId = noteToNode.get(targetNoteId)
      if (!targetNodeId) continue
      for (const srcNote of sourcingNotes) {
        const sourceNodeId = noteToNode.get(srcNote.id)
        if (!sourceNodeId) continue
        const exists = canvasEdges.some(
          e => (e.from_node_id === sourceNodeId && e.to_node_id === targetNodeId) ||
               (e.from_node_id === targetNodeId && e.to_node_id === sourceNodeId)
        )
        if (!exists) {
          await addEdge(sourceNodeId, targetNodeId, 'right', 'left', 'sage', '')
        }
      }
    }
  },

  // ── Cross-module links ─────────────

  linkNoteToProject: async (noteId, projectId) => {
    const prev = get().notes
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, project_id: projectId } : n)),
    }))
    try {
      await notesApi.updateNoteProjectLink(noteId, projectId)
    } catch (e) {
      set({ notes: prev })
      const msg = e instanceof Error ? e.message : 'Error al vincular nota al proyecto'
      toast(msg, 'error')
    }
  },

  linkNoteToSubscription: async (noteId, subscriptionId) => {
    const prev = get().notes
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, subscription_id: subscriptionId } : n)),
    }))
    try {
      await notesApi.updateNoteSubscriptionLink(noteId, subscriptionId)
    } catch (e) {
      set({ notes: prev })
      const msg = e instanceof Error ? e.message : 'Error al vincular nota a la suscripción'
      toast(msg, 'error')
    }
  },
})
