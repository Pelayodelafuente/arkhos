// ══════════════════════════════════════
// Arkhos — Notes Store: hooks derivados (selectors)
// ══════════════════════════════════════

import { useMemo } from 'react'
import type { Note } from '@/types/notes'
import { useNotesStore } from '@/stores/notes/store'

/**
 * Notas filtradas por searchQuery + activeTag.
 * Cuando hay searchQuery, usa los resultados del servidor (FTS).
 * Pinned primero, luego por el modo de orden seleccionado.
 */
export function useFilteredNotes(): Note[] {
  const notes = useNotesStore((s) => s.notes)
  const trashedNotes = useNotesStore((s) => s.trashedNotes)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const searchResults = useNotesStore((s) => s.searchResults)
  const activeTag = useNotesStore((s) => s.activeTag)
  const sortMode = useNotesStore((s) => s.sortMode)
  const activeFolderId = useNotesStore((s) => s.activeFolderId)

  return useMemo(() => {
    let result: Note[]

    // Cuando hay búsqueda activa, usar resultados del servidor
    if (searchQuery.trim() && activeFolderId !== 'trash') {
      result = searchResults
      if (activeTag) {
        result = result.filter((n) => n.tags.includes(activeTag))
      }
      return result
    }

    // Filter by folder/view
    if (activeFolderId === 'trash') {
      result = trashedNotes
    } else if (activeFolderId === 'archived') {
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

    if (activeTag) {
      result = result.filter((n) => n.tags.includes(activeTag))
    }

    const sorted = [...result].sort((a, b) => {
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

    return sorted
  }, [notes, trashedNotes, searchQuery, searchResults, activeTag, sortMode, activeFolderId])
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
