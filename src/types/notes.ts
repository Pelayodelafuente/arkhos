// ══════════════════════════════════════
// Arkhos — Notes Types
// Módulo Notas: notes + canvases + nodes + edges
// ══════════════════════════════════════

// ─── Color & Type Enums ─────────────

export type NoteColor = 'default' | 'sage' | 'terracotta' | 'stone' | 'blue' | 'gold'
export type NoteStatus = 'none' | 'idea' | 'in_progress' | 'done'

export const NOTE_STATUS_CONFIG: Record<NoteStatus, { label: string; color: string; bg: string }> = {
  none:        { label: '',           color: '',         bg: '' },
  idea:        { label: 'Idea',       color: '#B07A3A',  bg: 'rgba(176,122,58,0.12)' },
  in_progress: { label: 'En progreso', color: '#3B78B0', bg: 'rgba(59,120,176,0.12)' },
  done:        { label: 'Hecho',      color: '#2E7D6B',  bg: 'rgba(46,125,107,0.12)' },
}
export type NodeType = 'note' | 'text' | 'url' | 'group' | 'image'
export type EdgeColor = 'default' | 'sage' | 'terracotta' | 'stone' | 'blue'
export type EdgeStyle = 'arrow' | 'line' | 'bidirectional'
export type EdgeSide = 'top' | 'right' | 'bottom' | 'left'
export type NoteSortMode = 'recent' | 'oldest' | 'az' | 'za' | 'color' | 'tag' | 'manual'

// ─── Canvas Bounds ────────────────────

export const CANVAS_BOUNDS = {
  minX: 0,
  minY: 0,
  maxX: 4000,
  maxY: 3000,
} as const

// ─── Notes ──────────────────────────

export interface Note {
  id: string
  user_id: string
  title: string
  content: string   // puede ser '' cuando aún no se ha cargado en lazy mode
  color: NoteColor
  icon: string
  is_pinned: boolean
  word_count: number
  tags: string[]
  sort_order: number
  status?: NoteStatus
  folder_id?: string | null
  archived?: boolean
  favorited?: boolean
  backlink_count?: number
  deleted_at?: string | null
  project_id?: string | null
  subscription_id?: string | null
  contentLoaded?: boolean  // true cuando el content ha sido cargado del servidor
  created_at: string
  updated_at: string
}

/** Nota sin content — usada en la lista paginada */
export type NoteListItem = Omit<Note, 'content' | 'contentLoaded'>

// ─── Backlinks ────────────────────────

export interface NoteBacklink {
  id: string
  source_note_id: string
  target_note_id: string
  created_at: string
}

// ─── Folders ────────────────────────

export interface NoteFolder {
  id: string
  user_id: string
  name: string
  icon: string        // nombre icono Lucide
  color: NoteColor
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── Versions ────────────────────────

export interface NoteVersion {
  id: string
  note_id: string
  user_id: string
  title: string
  content: string
  version_number: number
  created_at: string
}

export interface NoteFormData {
  title: string
  content: string
  color: NoteColor
  icon: string
  tags: string[]
  status?: NoteStatus
}

// ─── Note Canvases ──────────────────

export interface NoteCanvas {
  id: string
  user_id: string
  name: string
  description: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// ─── Canvas Nodes ───────────────────

export interface CanvasNode {
  id: string
  canvas_id: string
  note_id: string | null
  node_type: NodeType
  pos_x: number
  pos_y: number
  width: number
  height: number
  content: string
  url: string
  label: string
  color: NoteColor
  z_index: number
  locked: boolean
  group_id: string | null
  collapsed?: boolean
  created_at: string
  note?: Note
}

// ─── Canvas Edges ───────────────────

export interface CanvasEdge {
  id: string
  canvas_id: string
  from_node_id: string
  to_node_id: string
  label: string
  color: EdgeColor
  style?: EdgeStyle
  from_side: EdgeSide
  to_side: EdgeSide
  created_at: string
}

// ─── Canvas Viewport ────────────────

export interface CanvasViewport {
  offsetX: number
  offsetY: number
  scale: number
}

// ─── Rubber Band Selection ──────────

export interface RubberBand {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

// ─── Snap Guide ─────────────────────

export interface SnapGuide {
  orientation: 'horizontal' | 'vertical'
  position: number
}

// ─── Color Configs ──────────────────

export const NOTE_COLOR_CONFIG: { value: NoteColor; bg: string; border: string; label: string }[] = [
  { value: 'default', bg: '#f7f1e8', border: 'rgba(160,120,80,0.35)', label: 'Neutro' },
  { value: 'sage', bg: '#faf5ec', border: '#B07A3A', label: 'Sage' },
  { value: 'terracotta', bg: '#faf0ec', border: '#C4704A', label: 'Terracotta' },
  { value: 'stone', bg: '#f5f2ee', border: 'var(--text-faint)', label: 'Stone' },
  { value: 'blue', bg: '#eef2f8', border: '#3B78B0', label: 'Blue' },
  { value: 'gold', bg: '#faf5ec', border: '#C4974A', label: 'Gold' },
]

// ─── History Entry ────────────────────

export interface HistoryEntry {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export const EDGE_COLOR_CONFIG: Record<string, string> = {
  default: 'var(--text-faint)',
  sage: 'var(--module-notas)',
  terracotta: '#C4704A',
  stone: '#8A7A6A',
  blue: '#3B78B0',
}
