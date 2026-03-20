// ══════════════════════════════════════
// Arkhos — Notes Data Layer
// Módulo Notas: notes + canvases + nodes + edges
// ══════════════════════════════════════

import { createBrowserClient } from '@supabase/ssr'
import type {
  Note,
  NoteFormData,
  NoteCanvas,
  CanvasNode,
  CanvasEdge,
} from '@/types/notes'

// ─── Client factory ───────────────────

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Error helper ─────────────────────

class NotesError extends Error {
  constructor(message: string, public readonly detail?: string) {
    super(message)
    this.name = 'NotesError'
  }
}

// ══════════════════════════════════════
// NOTES
// ══════════════════════════════════════

export async function getNotes(userId: string): Promise<Note[]> {
  const client = createClient()
  const { data, error } = await client
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) throw new NotesError('Error fetching notes', error.message)
  return (data ?? []) as Note[]
}

export async function getNoteById(id: string): Promise<Note | null> {
  const client = createClient()
  const { data, error } = await client
    .from('notes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new NotesError('Error fetching note', error.message)
  return data as Note | null
}

export async function createNote(userId: string, formData: NoteFormData): Promise<Note> {
  const client = createClient()
  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length
  const { data, error } = await client
    .from('notes')
    .insert({
      user_id: userId,
      title: formData.title || 'Sin título',
      content: formData.content,
      color: formData.color,
      icon: formData.icon,
      tags: formData.tags,
      word_count: wordCount,
    })
    .select()
    .single()

  if (error) throw new NotesError('Error creating note', error.message)
  if (!data) throw new NotesError('Error creating note: no data returned')
  return data as Note
}

export async function updateNote(
  id: string,
  data: Partial<NoteFormData & { is_pinned?: boolean; sort_order?: number }>
): Promise<Note> {
  const client = createClient()
  const update: Record<string, unknown> = { ...data }
  if (data.content !== undefined) {
    update.word_count = data.content.trim().split(/\s+/).filter(Boolean).length
  }
  const { data: row, error } = await client
    .from('notes')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new NotesError('Error updating note', error.message)
  if (!row) throw new NotesError('Error updating note: no data returned')
  return row as Note
}

export async function deleteNote(id: string): Promise<void> {
  const client = createClient()
  const { error } = await client.from('notes').delete().eq('id', id)
  if (error) throw new NotesError('Error deleting note', error.message)
}

export async function togglePinNote(id: string, isPinned: boolean): Promise<void> {
  const client = createClient()
  const { error } = await client
    .from('notes')
    .update({ is_pinned: isPinned })
    .eq('id', id)
  if (error) throw new NotesError('Error toggling note pin', error.message)
}

export async function searchNotes(userId: string, query: string): Promise<Note[]> {
  const client = createClient()
  const { data, error } = await client
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('updated_at', { ascending: false })

  if (error) throw new NotesError('Error searching notes', error.message)
  return (data ?? []) as Note[]
}

export async function getNotesByTag(userId: string, tag: string): Promise<Note[]> {
  const client = createClient()
  const { data, error } = await client
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .contains('tags', [tag])
    .order('updated_at', { ascending: false })

  if (error) throw new NotesError('Error fetching notes by tag', error.message)
  return (data ?? []) as Note[]
}

// ══════════════════════════════════════
// CANVASES
// ══════════════════════════════════════

export async function getOrCreateDefaultCanvas(userId: string): Promise<NoteCanvas> {
  const client = createClient()

  // Try to find existing default
  const { data: existing } = await client
    .from('note_canvases')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single()

  if (existing) return existing as NoteCanvas

  // Create default canvas
  const { data, error } = await client
    .from('note_canvases')
    .insert({ user_id: userId, name: 'Mi Canvas', is_default: true })
    .select()
    .single()

  if (error) throw new NotesError('Error creating default canvas', error.message)
  if (!data) throw new NotesError('Error creating default canvas: no data returned')
  return data as NoteCanvas
}

export async function getCanvasWithNodes(
  canvasId: string
): Promise<{ canvas: NoteCanvas; nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  const client = createClient()

  const [canvasRes, nodesRes, edgesRes] = await Promise.all([
    client.from('note_canvases').select('*').eq('id', canvasId).single(),
    client.from('canvas_nodes').select('*, note:notes(*)').eq('canvas_id', canvasId).order('z_index'),
    client.from('canvas_edges').select('*').eq('canvas_id', canvasId),
  ])

  if (canvasRes.error) throw new NotesError('Error fetching canvas', canvasRes.error.message)

  return {
    canvas: canvasRes.data as NoteCanvas,
    nodes: (nodesRes.data ?? []) as CanvasNode[],
    edges: (edgesRes.data ?? []) as CanvasEdge[],
  }
}

// ══════════════════════════════════════
// CANVAS SYNC — notes ↔ canvas_nodes
// ══════════════════════════════════════

/**
 * Find all notes that don't have a canvas_node in the given canvas.
 * Returns notes that need to be added to the canvas.
 */
export async function getNotesWithoutCanvasNode(
  canvasId: string,
  userId: string
): Promise<Note[]> {
  const client = createClient()

  // Get all note_ids already on this canvas
  const { data: existingNodes } = await client
    .from('canvas_nodes')
    .select('note_id')
    .eq('canvas_id', canvasId)
    .not('note_id', 'is', null)

  const existingNoteIds = new Set((existingNodes ?? []).map((n) => n.note_id))

  // Get all user's notes
  const { data: allNotes, error } = await client
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) throw new NotesError('Error fetching notes for sync', error.message)

  return ((allNotes ?? []) as Note[]).filter((n) => !existingNoteIds.has(n.id))
}

/**
 * Batch-create canvas_nodes for notes missing from the canvas.
 * Uses auto-layout: grid of 3 columns, pinned notes first.
 */
export async function syncNotesToCanvas(
  canvasId: string,
  userId: string,
  existingNodes: CanvasNode[]
): Promise<CanvasNode[]> {
  const missingNotes = await getNotesWithoutCanvasNode(canvasId, userId)
  if (missingNotes.length === 0) return []

  const client = createClient()
  const CARD_W = 280
  const CARD_H = 160
  const GAP = 40
  const COLS = 3

  // Calculate starting position based on existing nodes
  let startY = 0
  if (existingNodes.length > 0) {
    startY = Math.max(...existingNodes.map((n) => n.pos_y + n.height)) + GAP * 2
  }

  const inserts = missingNotes.map((note, i) => ({
    canvas_id: canvasId,
    note_id: note.id,
    node_type: 'note' as const,
    pos_x: (i % COLS) * (CARD_W + GAP),
    pos_y: startY + Math.floor(i / COLS) * (CARD_H + GAP),
    width: CARD_W,
    height: CARD_H,
    color: note.color,
  }))

  const { data, error } = await client
    .from('canvas_nodes')
    .insert(inserts)
    .select('*, note:notes(*)')

  if (error) throw new NotesError('Error syncing notes to canvas', error.message)
  return (data ?? []) as CanvasNode[]
}

// ══════════════════════════════════════
// CANVAS NODES
// ══════════════════════════════════════

export async function addNoteToCanvas(
  canvasId: string,
  noteId: string,
  pos: { x: number; y: number }
): Promise<CanvasNode> {
  const client = createClient()

  // Check for existing node (prevent duplicates)
  const { data: existing } = await client
    .from('canvas_nodes')
    .select('*, note:notes(*)')
    .eq('canvas_id', canvasId)
    .eq('note_id', noteId)
    .maybeSingle()

  if (existing) return existing as CanvasNode

  const { data, error } = await client
    .from('canvas_nodes')
    .insert({
      canvas_id: canvasId,
      note_id: noteId,
      node_type: 'note',
      pos_x: pos.x,
      pos_y: pos.y,
    })
    .select('*, note:notes(*)')
    .single()

  if (error) throw new NotesError('Error adding note to canvas', error.message)
  if (!data) throw new NotesError('Error adding note to canvas: no data returned')
  return data as CanvasNode
}

export async function addTextNodeToCanvas(
  canvasId: string,
  content: string,
  pos: { x: number; y: number }
): Promise<CanvasNode> {
  const client = createClient()
  const { data, error } = await client
    .from('canvas_nodes')
    .insert({
      canvas_id: canvasId,
      node_type: 'text',
      content,
      pos_x: pos.x,
      pos_y: pos.y,
      width: 200,
      height: 100,
    })
    .select()
    .single()

  if (error) throw new NotesError('Error adding text node to canvas', error.message)
  if (!data) throw new NotesError('Error adding text node to canvas: no data returned')
  return data as CanvasNode
}

export async function addUrlNodeToCanvas(
  canvasId: string,
  url: string,
  pos: { x: number; y: number }
): Promise<CanvasNode> {
  const client = createClient()
  const { data, error } = await client
    .from('canvas_nodes')
    .insert({
      canvas_id: canvasId,
      node_type: 'url',
      url,
      pos_x: pos.x,
      pos_y: pos.y,
      width: 240,
      height: 80,
    })
    .select()
    .single()

  if (error) throw new NotesError('Error adding URL node to canvas', error.message)
  if (!data) throw new NotesError('Error adding URL node to canvas: no data returned')
  return data as CanvasNode
}

export async function addGroupNodeToCanvas(
  canvasId: string,
  label: string,
  pos: { x: number; y: number },
  size: { width: number; height: number }
): Promise<CanvasNode> {
  const client = createClient()
  const { data, error } = await client
    .from('canvas_nodes')
    .insert({
      canvas_id: canvasId,
      node_type: 'group',
      label,
      pos_x: pos.x,
      pos_y: pos.y,
      width: size.width,
      height: size.height,
      color: 'sage',
    })
    .select()
    .single()

  if (error) throw new NotesError('Error adding group to canvas', error.message)
  if (!data) throw new NotesError('Error adding group to canvas: no data returned')
  return data as CanvasNode
}

export async function updateNodePosition(
  nodeId: string,
  pos: { x: number; y: number }
): Promise<void> {
  const client = createClient()
  const { error } = await client
    .from('canvas_nodes')
    .update({ pos_x: pos.x, pos_y: pos.y })
    .eq('id', nodeId)

  if (error) throw new NotesError('Error updating node position', error.message)
}

export async function updateNodeSize(
  nodeId: string,
  size: { width: number; height: number }
): Promise<void> {
  const client = createClient()
  const { error } = await client
    .from('canvas_nodes')
    .update({ width: size.width, height: size.height })
    .eq('id', nodeId)

  if (error) throw new NotesError('Error updating node size', error.message)
}

export async function updateNodeContent(
  nodeId: string,
  content: string
): Promise<void> {
  const client = createClient()
  const { error } = await client
    .from('canvas_nodes')
    .update({ content })
    .eq('id', nodeId)

  if (error) throw new NotesError('Error updating node content', error.message)
}

export async function updateNodeLocked(
  nodeId: string,
  locked: boolean
): Promise<void> {
  const client = createClient()
  const { error } = await client
    .from('canvas_nodes')
    .update({ locked })
    .eq('id', nodeId)

  if (error) throw new NotesError('Error updating node lock', error.message)
}

export async function batchUpdateNodePositions(
  updates: { id: string; pos_x: number; pos_y: number }[]
): Promise<void> {
  const client = createClient()
  // Use Promise.all for batch updates
  const results = await Promise.all(
    updates.map((u) =>
      client.from('canvas_nodes').update({ pos_x: u.pos_x, pos_y: u.pos_y }).eq('id', u.id)
    )
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new NotesError('Error batch updating positions', failed.error.message)
}

export async function removeNodeFromCanvas(nodeId: string): Promise<void> {
  const client = createClient()
  const { error } = await client.from('canvas_nodes').delete().eq('id', nodeId)
  if (error) throw new NotesError('Error removing node from canvas', error.message)
}

export async function batchRemoveNodes(nodeIds: string[]): Promise<void> {
  const client = createClient()
  const { error } = await client.from('canvas_nodes').delete().in('id', nodeIds)
  if (error) throw new NotesError('Error batch removing nodes', error.message)
}

// ══════════════════════════════════════
// CANVAS EDGES
// ══════════════════════════════════════

export async function createEdge(
  canvasId: string,
  fromNodeId: string,
  toNodeId: string,
  label?: string
): Promise<CanvasEdge> {
  const client = createClient()
  const { data, error } = await client
    .from('canvas_edges')
    .insert({
      canvas_id: canvasId,
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      label: label ?? '',
    })
    .select()
    .single()

  if (error) throw new NotesError('Error creating edge', error.message)
  if (!data) throw new NotesError('Error creating edge: no data returned')
  return data as CanvasEdge
}

export async function updateEdge(
  edgeId: string,
  data: Partial<Pick<CanvasEdge, 'label' | 'color'>>
): Promise<CanvasEdge> {
  const client = createClient()
  const { data: row, error } = await client
    .from('canvas_edges')
    .update(data)
    .eq('id', edgeId)
    .select()
    .single()

  if (error) throw new NotesError('Error updating edge', error.message)
  if (!row) throw new NotesError('Error updating edge: no data returned')
  return row as CanvasEdge
}

export async function deleteEdge(edgeId: string): Promise<void> {
  const client = createClient()
  const { error } = await client.from('canvas_edges').delete().eq('id', edgeId)
  if (error) throw new NotesError('Error deleting edge', error.message)
}

// ══════════════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════════════

export async function exportCanvasToJSON(canvasId: string): Promise<string> {
  const { canvas, nodes, edges } = await getCanvasWithNodes(canvasId)
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    canvas: { name: canvas.name, description: canvas.description },
    nodes: nodes.map((n) => ({
      id: n.id,
      node_type: n.node_type,
      pos_x: n.pos_x,
      pos_y: n.pos_y,
      width: n.width,
      height: n.height,
      content: n.node_type === 'note' ? (n.note?.content ?? n.content) : n.content,
      label: n.node_type === 'note' ? (n.note?.title ?? n.label) : n.label,
      color: n.color,
      url: n.url,
    })),
    edges: edges.map((e) => ({
      from_node: e.from_node_id,
      to_node: e.to_node_id,
      label: e.label,
      color: e.color,
      from_side: e.from_side,
      to_side: e.to_side,
    })),
  }
  return JSON.stringify(exportData, null, 2)
}
