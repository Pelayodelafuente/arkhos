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
