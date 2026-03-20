// ══════════════════════════════════════
// Arkhos — Notes Types
// Módulo Notas: notes + canvases + nodes + edges
// ══════════════════════════════════════

// ─── Color & Type Enums ─────────────

export type NoteColor = 'default' | 'sage' | 'terracotta' | 'stone' | 'blue' | 'gold'
export type NodeType = 'note' | 'text' | 'url' | 'group'
export type EdgeColor = 'default' | 'sage' | 'terracotta' | 'stone' | 'blue'
export type EdgeSide = 'top' | 'right' | 'bottom' | 'left'

// ─── Notes ──────────────────────────

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  color: NoteColor
  icon: string
  is_pinned: boolean
  word_count: number
  tags: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

export interface NoteFormData {
  title: string
  content: string
  color: NoteColor
  icon: string
  tags: string[]
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
  { value: 'default', bg: '#FAF7F2', border: '#E2D9CA', label: 'Neutro' },
  { value: 'sage', bg: '#eef3ee', border: '#7a9b76', label: 'Sage' },
  { value: 'terracotta', bg: '#faf0ec', border: '#C4704A', label: 'Terracotta' },
  { value: 'stone', bg: '#f5f2ee', border: '#B0A48F', label: 'Stone' },
  { value: 'blue', bg: '#eef2f8', border: '#6B8CC4', label: 'Blue' },
  { value: 'gold', bg: '#faf5ec', border: '#C4974A', label: 'Gold' },
]

export const EDGE_COLOR_CONFIG: Record<string, string> = {
  default: '#B0A48F',
  sage: '#7a9b76',
  terracotta: '#C4704A',
  stone: '#8A7A6A',
  blue: '#6B8CC4',
}
