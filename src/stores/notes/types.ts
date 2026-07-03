// ══════════════════════════════════════
// Arkhos — Notes Store: tipos de slices
// NotesStore = unión de todos los slices (patrón slices Zustand v5)
// ══════════════════════════════════════

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
  NodeType,
  NoteColor,
  NoteFolder,
  NoteSortMode,
} from '@/types/notes'

// ─── Notes slice ──────────────────────
// List view: fetch, búsqueda server-side, paginación, CRUD, hydration, filters

export interface NotesSlice {
  // State
  notes: Note[]
  initialized: boolean
  isLoading: boolean
  searchQuery: string
  activeTag: string | null
  viewMode: 'list' | 'canvas' | 'graph'
  sortMode: NoteSortMode

  // Split-pane selected note
  selectedNoteId: string | null

  // Paginación lazy
  notesOffset: number
  hasMoreNotes: boolean
  isLoadingMore: boolean

  // Búsqueda server-side
  isSearching: boolean
  searchResults: Note[]  // resultados del servidor cuando hay searchQuery activo

  // Data fetching
  fetchNotes: (userId: string) => Promise<void>
  loadMoreNotes: (userId: string) => Promise<void>
  loadNoteContent: (noteId: string) => Promise<void>
  performSearch: (userId: string, query: string) => Promise<void>

  // Note CRUD (optimistic)
  addNote: (userId: string, data: NoteFormData) => Promise<Note | null>
  editNote: (id: string, data: Partial<NoteFormData>) => Promise<void>
  removeNote: (id: string) => Promise<void>
  duplicateNote: (noteId: string, userId: string) => Promise<void>
  togglePin: (id: string) => Promise<void>

  // Hydration (server → store)
  setNotes: (notes: Note[]) => void

  // List filters
  setSearchQuery: (q: string) => void
  setActiveTag: (tag: string | null) => void
  setViewMode: (mode: 'list' | 'canvas' | 'graph') => void
  setSortMode: (mode: NoteSortMode) => void

  // Split-pane
  setSelectedNoteId: (id: string | null) => void
}

// ─── Notes graph slice ────────────────
// Vista grafo de conocimiento: nodos = notas, aristas = backlinks [[wikilink]]

/** Par de backlink tal y como lo devuelve getAllBacklinksForGraph */
export interface NoteBacklinkPair {
  source_note_id: string
  target_note_id: string
}

export interface NotesGraphSlice {
  /** Todas las notas activas del usuario (ligeras, sin content, ≤500) */
  graphNotes: Note[]
  /** Todos los backlinks del usuario */
  graphBacklinks: NoteBacklinkPair[]
  graphLoaded: boolean
  isGraphLoading: boolean

  loadGraphData: (userId: string, opts?: { force?: boolean }) => Promise<void>
  invalidateGraph: () => void
  /** Inserta una graphNote en s.notes si la paginación aún no la trajo (NotePane) */
  ensureNoteInList: (noteId: string) => void
}

// ─── Notes organize slice ─────────────
// Archive, favoritos, multi-select de notas, backlinks, cross-module links

export interface NotesOrganizeSlice {
  // Note multi-select (list view)
  selectedNoteIds: Set<string>
  isSelectionMode: boolean

  // Backlinks
  noteReferences: Record<string, Note[]>  // noteId → notas que menciona
  noteBacklinks: Record<string, Note[]>   // noteId → notas que la mencionan

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

  // Backlinks
  loadNoteLinks: (noteId: string) => Promise<void>
  syncBacklinksOnSave: (noteId: string, content: string) => Promise<void>
  generateBacklinkEdges: () => Promise<void>

  // Cross-module links
  linkNoteToProject: (noteId: string, projectId: string | null) => Promise<void>
  linkNoteToSubscription: (noteId: string, subscriptionId: string | null) => Promise<void>
}

// ─── Folders slice ────────────────────
// Carpetas + papelera (trash)

export interface FoldersSlice {
  // Folders
  folders: NoteFolder[]
  activeFolderId: string | null  // null = todas, 'archived' = archivo, 'favorites' = favoritas, 'no-folder' = sin carpeta

  // Trash
  trashedNotes: Note[]

  // Folders
  fetchFolders: (userId: string) => Promise<void>
  addFolder: (userId: string, data: Pick<NoteFolder, 'name' | 'icon' | 'color'>) => Promise<void>
  editFolder: (id: string, data: Partial<Pick<NoteFolder, 'name' | 'icon' | 'color'>>) => Promise<void>
  removeFolder: (id: string) => Promise<void>
  reorderFoldersAction: (orderedIds: string[]) => Promise<void>
  moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>
  setActiveFolderId: (id: string | null) => void

  // Trash
  restoreFromTrash: (id: string) => Promise<void>
  permanentlyDelete: (id: string) => Promise<void>
  emptyTrash: () => Promise<void>
  fetchTrashedNotes: (userId: string) => Promise<void>
}

// ─── Canvas nodes slice ───────────────
// Canvas fetch/init/sync + operaciones de nodos, snap, inline editing,
// resize, label, color, auto-layout

export interface CanvasNodesSlice {
  // Canvas
  canvas: NoteCanvas | null
  canvasNodes: CanvasNode[]

  // Snap
  snapEnabled: boolean
  snapGuides: SnapGuide[]

  // Inline editing
  editingNodeId: string | null

  // Resize
  resizingNodeId: string | null

  // Canvas fetch — vive aquí (y no en notes-slice) porque opera sobre canvas/canvasNodes
  fetchCanvas: (canvasId: string) => Promise<void>
  initCanvas: (userId: string) => Promise<void>

  // Sync notes ↔ canvas_nodes
  syncNotesToCanvas: (userId: string) => Promise<void>

  // Hydration (server → store)
  setCanvas: (canvas: NoteCanvas) => void

  // Canvas node operations (optimistic)
  addNoteToCanvas: (noteId: string, pos: { x: number; y: number }) => Promise<CanvasNode | null>
  addTextNode: (content: string, pos: { x: number; y: number }) => Promise<CanvasNode | null>
  addUrlNode: (url: string, pos: { x: number; y: number }) => Promise<CanvasNode | null>
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

  // Snap
  toggleSnap: () => void
  setSnapGuides: (guides: SnapGuide[]) => void

  // Inline editing
  setEditingNode: (id: string | null) => void

  // Resize
  setResizingNode: (id: string | null) => void

  // Auto-layout
  autoLayoutNodes: () => void

  // Node label
  updateNodeLabel: (id: string, label: string) => Promise<void>

  // Node color
  updateNodeColor: (id: string, color: NoteColor) => void
}

// ─── Canvas interaction slice ─────────
// Edges, selection, rubber band, connection, viewport, undo/redo,
// clipboard, duplicate, canvas search, canvas filters

export interface CanvasInteractionSlice {
  // Canvas
  canvasEdges: CanvasEdge[]
  viewport: CanvasViewport

  // Selection (multi-select)
  selectedNodeIds: Set<string>
  selectedEdgeId: string | null

  // Connection drag
  connectingFromNodeId: string | null

  // Rubber band selection
  rubberBand: RubberBand | null

  // Undo/redo
  history: HistoryEntry[]
  historyIndex: number

  // Clipboard
  clipboard: { nodes: CanvasNode[]; edges: CanvasEdge[] } | null

  // Canvas search
  canvasSearchQuery: string

  // Canvas filters
  canvasFilters: { types: NodeType[]; colors: NoteColor[] }

  // Canvas edge operations
  addEdge: (fromNodeId: string, toNodeId: string, fromSide?: EdgeSide, toSide?: EdgeSide, color?: EdgeColor, label?: string) => Promise<CanvasEdge | null>
  editEdge: (id: string, data: Partial<Pick<CanvasEdge, 'label' | 'color' | 'style'>>) => Promise<void>
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

  // Canvas filters
  setCanvasFilters: (f: { types: NodeType[]; colors: NoteColor[] }) => void
  clearCanvasFilters: () => void
}

// ─── Store completo ───────────────────

export type NotesStore = NotesSlice &
  NotesOrganizeSlice &
  NotesGraphSlice &
  FoldersSlice &
  CanvasNodesSlice &
  CanvasInteractionSlice
