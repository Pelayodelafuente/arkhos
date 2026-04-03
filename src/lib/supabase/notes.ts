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
  EdgeSide,
  EdgeColor,
  NoteFolder,
  NoteVersion,
} from '@/types/notes'

// ─── Client factory ───────────────────

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function getClient() {
  return createClient()
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
  const plainText = formData.content.replace(/<[^>]*>/g, ' ')
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length
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
  const { data: { session } } = await client.auth.getSession()
  const update: Record<string, unknown> = { ...data }
  if (data.content !== undefined) {
    const plainText = data.content.replace(/<[^>]*>/g, ' ')
    update.word_count = plainText.trim().split(/\s+/).filter(Boolean).length
  }
  const query = client.from('notes').update(update).eq('id', id)
  if (session?.user?.id) query.eq('user_id', session.user.id)
  const { data: row, error } = await query.select().single()

  if (error) throw new NotesError('Error updating note', error.message)
  if (!row) throw new NotesError('Error updating note: no data returned')
  return row as Note
}

export async function deleteNote(id: string): Promise<void> {
  const client = createClient()
  const { data: { session } } = await client.auth.getSession()
  const query = client.from('notes').delete().eq('id', id)
  if (session?.user?.id) query.eq('user_id', session.user.id)
  const { error } = await query
  if (error) throw new NotesError('Error deleting note', error.message)
}

export async function togglePinNote(id: string, isPinned: boolean): Promise<void> {
  const client = createClient()
  const { data: { session } } = await client.auth.getSession()
  const query = client.from('notes').update({ is_pinned: isPinned }).eq('id', id)
  if (session?.user?.id) query.eq('user_id', session.user.id)
  const { error } = await query
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
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
  const client = createClient()
  const { data, error } = await client
    .from('canvas_nodes')
    .insert({
      canvas_id: canvasId,
      node_type: 'url',
      url: normalizedUrl,
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

export async function addImageNodeToCanvas(
  canvasId: string,
  imageUrl: string,
  pos: { x: number; y: number },
  dimensions?: { width: number; height: number }
): Promise<CanvasNode> {
  const client = createClient()
  const { data, error } = await client
    .from('canvas_nodes')
    .insert({
      canvas_id: canvasId,
      node_type: 'image',
      url: imageUrl,
      pos_x: pos.x,
      pos_y: pos.y,
      width: dimensions?.width ?? 300,
      height: dimensions?.height ?? 200,
    })
    .select()
    .single()

  if (error) throw new NotesError('Error adding image node to canvas', error.message)
  if (!data) throw new NotesError('Error adding image node to canvas: no data returned')
  return data as CanvasNode
}

/**
 * Upload an image to Supabase Storage for use in canvas image nodes.
 * Bucket `note-images` must exist in Supabase dashboard with public access.
 */
export async function uploadCanvasImage(
  userId: string,
  canvasId: string,
  file: File
): Promise<string> {
  const client = createClient()
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${canvasId}/${timestamp}-${sanitizedName}`

  const { error: uploadError } = await client.storage
    .from('note-images')
    .upload(path, file)

  if (uploadError) {
    throw new NotesError('Error al subir imagen', uploadError.message)
  }

  const { data: urlData } = client.storage
    .from('note-images')
    .getPublicUrl(path)

  return urlData.publicUrl
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
  label?: string,
  fromSide: EdgeSide = 'right',
  toSide: EdgeSide = 'left',
  color: EdgeColor = 'default'
): Promise<CanvasEdge> {
  const client = createClient()
  const { data, error } = await client
    .from('canvas_edges')
    .insert({
      canvas_id: canvasId,
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      label: label ?? '',
      from_side: fromSide,
      to_side: toSide,
      color,
    })
    .select()
    .single()

  if (error) throw new NotesError('Error creating edge', error.message)
  if (!data) throw new NotesError('Error creating edge: no data returned')
  return data as CanvasEdge
}

export async function updateEdge(
  edgeId: string,
  data: Partial<Pick<CanvasEdge, 'label' | 'color' | 'style' | 'from_side' | 'to_side'>>
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

// ══════════════════════════════════════
// FOLDERS
// ══════════════════════════════════════

export async function getFolders(userId: string): Promise<NoteFolder[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('note_folders')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
  if (error) throw new NotesError('Error fetching folders', error.message)
  return (data ?? []) as NoteFolder[]
}

export async function createFolder(
  userId: string,
  data: Pick<NoteFolder, 'name' | 'icon' | 'color'>
): Promise<NoteFolder> {
  const supabase = createClient()
  const { data: folder, error } = await supabase
    .from('note_folders')
    .insert({ user_id: userId, ...data })
    .select()
    .single()
  if (error) throw new NotesError('Error creating folder', error.message)
  if (!folder) throw new NotesError('Error creating folder: no data returned')
  return folder as NoteFolder
}

export async function updateFolder(
  id: string,
  data: Partial<Pick<NoteFolder, 'name' | 'icon' | 'color' | 'sort_order'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('note_folders').update(data).eq('id', id)
  if (error) throw new NotesError('Error updating folder', error.message)
}

export async function deleteFolder(id: string): Promise<void> {
  // Notes in this folder get folder_id = null (ON DELETE SET NULL)
  const supabase = createClient()
  const { error } = await supabase.from('note_folders').delete().eq('id', id)
  if (error) throw new NotesError('Error deleting folder', error.message)
}

export async function moveNoteToFolder(noteId: string, folderId: string | null): Promise<void> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const query = supabase.from('notes').update({ folder_id: folderId }).eq('id', noteId)
  if (session?.user?.id) query.eq('user_id', session.user.id)
  const { error } = await query
  if (error) throw new NotesError('Error moving note to folder', error.message)
}

export async function archiveNote(noteId: string, archived: boolean): Promise<void> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const query = supabase.from('notes').update({ archived }).eq('id', noteId)
  if (session?.user?.id) query.eq('user_id', session.user.id)
  const { error } = await query
  if (error) throw new NotesError('Error archiving note', error.message)
}

export async function toggleFavorite(noteId: string, favorited: boolean): Promise<void> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const query = supabase.from('notes').update({ favorited }).eq('id', noteId)
  if (session?.user?.id) query.eq('user_id', session.user.id)
  const { error } = await query
  if (error) throw new NotesError('Error toggling favorite', error.message)
}

// ══════════════════════════════════════
// VERSIONS
// ══════════════════════════════════════

export async function saveNoteVersion(
  noteId: string,
  userId: string,
  title: string,
  content: string
): Promise<void> {
  const supabase = createClient()
  // Get current max version_number
  const { data: latest } = await supabase
    .from('note_versions')
    .select('version_number')
    .eq('note_id', noteId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = (latest?.version_number ?? 0) + 1
  await supabase
    .from('note_versions')
    .insert({ note_id: noteId, user_id: userId, title, content, version_number: nextVersion })
  // Keep only last 20 versions
  const { data: allVersions } = await supabase
    .from('note_versions')
    .select('id')
    .eq('note_id', noteId)
    .order('version_number', { ascending: true })
  if (allVersions && allVersions.length > 20) {
    const toDelete = allVersions.slice(0, allVersions.length - 20).map((v) => v.id)
    await supabase.from('note_versions').delete().in('id', toDelete)
  }
}

export async function getNoteVersions(noteId: string): Promise<NoteVersion[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('note_versions')
    .select('*')
    .eq('note_id', noteId)
    .order('version_number', { ascending: false })
  if (error) throw new NotesError('Error fetching note versions', error.message)
  return (data ?? []) as NoteVersion[]
}

// ─── Backlinks ───────────────────────────────────────────────────

/** Parsea [[título]] del contenido y devuelve IDs de notas referenciadas */
export function parseBacklinksFromContent(content: string, allNotes: Note[]): string[] {
  if (!content) return []
  const titleMap = new Map(allNotes.map(n => [n.title.toLowerCase(), n.id]))
  const matches = [...content.matchAll(/\[\[([^\]]+)\]\]/g)]
  const ids: string[] = []
  for (const [, title] of matches) {
    const id = titleMap.get(title.toLowerCase())
    if (id && !ids.includes(id)) ids.push(id)
  }
  return ids
}

/** Sincroniza backlinks de una nota: borra los viejos e inserta los nuevos */
export async function syncNoteBacklinks(
  sourceNoteId: string,
  targetNoteIds: string[]
): Promise<void> {
  const supabase = createClient()
  await supabase.from('note_backlinks').delete().eq('source_note_id', sourceNoteId)
  if (targetNoteIds.length > 0) {
    await supabase.from('note_backlinks').insert(
      targetNoteIds.map(tid => ({ source_note_id: sourceNoteId, target_note_id: tid }))
    )
  }
}

/** Notas que ESTA nota menciona (outgoing) */
export async function getNoteReferences(noteId: string): Promise<Note[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('note_backlinks')
    .select('notes!note_backlinks_target_note_id_fkey(*)')
    .eq('source_note_id', noteId)
  if (!data) return []
  return data.map((r: Record<string, unknown>) => r.notes as Note).filter(Boolean)
}

/** Notas que MENCIONAN esta nota (incoming) */
export async function getNoteBacklinks(noteId: string): Promise<Note[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('note_backlinks')
    .select('notes!note_backlinks_source_note_id_fkey(*)')
    .eq('target_note_id', noteId)
  if (!data) return []
  return data.map((r: Record<string, unknown>) => r.notes as Note).filter(Boolean)
}

/** Context builder para IA */
export async function buildNoteContext(
  noteId: string
): Promise<{ note: Note; references: Note[]; backlinks: Note[] } | null> {
  const supabase = createClient()
  const [noteRes, references, backlinks] = await Promise.all([
    supabase.from('notes').select('*').eq('id', noteId).single(),
    getNoteReferences(noteId),
    getNoteBacklinks(noteId),
  ])
  if (!noteRes.data) return null
  return { note: noteRes.data as Note, references, backlinks }
}
