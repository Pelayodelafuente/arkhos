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
// CANVAS NODES
// ══════════════════════════════════════

export async function addNoteToCanvas(
  canvasId: string,
  noteId: string,
  pos: { x: number; y: number }
): Promise<CanvasNode> {
  const client = createClient()
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

export async function removeNodeFromCanvas(nodeId: string): Promise<void> {
  const client = createClient()
  const { error } = await client.from('canvas_nodes').delete().eq('id', nodeId)
  if (error) throw new NotesError('Error removing node from canvas', error.message)
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
