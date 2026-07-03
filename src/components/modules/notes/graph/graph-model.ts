// ══════════════════════════════════════
// Arkhos — Grafo de Notas: modelo puro (sin React ni d3)
// Construye nodos/aristas a partir de notas + backlinks, con filtros.
// Testeable en vitest.
// ══════════════════════════════════════

import type { Note, NoteFolder, NoteColor } from '@/types/notes'
import type { NoteBacklinkPair } from '@/stores/notes/types'
import { GRAPH_NODE_RADIUS, GRAPH_LABEL_MAX_CHARS } from './graph-constants'

export interface GraphNodeDatum {
  id: string
  title: string
  colorKey: NoteColor
  degree: number
  isOrphan: boolean
  // Campos mutables de d3-force (posiciones); nunca renderizados por React
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

export interface GraphLinkDatum {
  // d3-force sustituye los ids por referencias a los nodos al inicializar
  source: string | GraphNodeDatum
  target: string | GraphNodeDatum
}

export interface GraphFilters {
  folderId: string | null
  showOrphans: boolean
}

export interface GraphData {
  nodes: GraphNodeDatum[]
  links: GraphLinkDatum[]
}

/** id de un extremo de link, sea string o datum ya resuelto por d3 */
export function linkEndpointId(endpoint: string | GraphNodeDatum): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id
}

export function buildGraph(
  notes: Note[],
  backlinks: NoteBacklinkPair[],
  folders: NoteFolder[],
  filters: GraphFilters
): GraphData {
  const folderById = new Map(folders.map((f) => [f.id, f]))

  const filteredNotes = filters.folderId
    ? notes.filter((n) => n.folder_id === filters.folderId)
    : notes

  const noteIds = new Set(filteredNotes.map((n) => n.id))

  // Aristas válidas: ambos extremos presentes, sin self-links, sin duplicados exactos
  const seenPairs = new Set<string>()
  const links: GraphLinkDatum[] = []
  for (const b of backlinks) {
    if (b.source_note_id === b.target_note_id) continue
    if (!noteIds.has(b.source_note_id) || !noteIds.has(b.target_note_id)) continue
    const key = `${b.source_note_id}→${b.target_note_id}`
    if (seenPairs.has(key)) continue
    seenPairs.add(key)
    links.push({ source: b.source_note_id, target: b.target_note_id })
  }

  // Grado por nota (una arista bidireccional A↔B cuenta 1 por dirección presente)
  const degree = new Map<string, number>()
  for (const l of links) {
    const s = linkEndpointId(l.source)
    const t = linkEndpointId(l.target)
    degree.set(s, (degree.get(s) ?? 0) + 1)
    degree.set(t, (degree.get(t) ?? 0) + 1)
  }

  let nodes: GraphNodeDatum[] = filteredNotes.map((n) => {
    const folder = n.folder_id ? folderById.get(n.folder_id) : undefined
    const d = degree.get(n.id) ?? 0
    return {
      id: n.id,
      title: n.title,
      colorKey: (folder?.color ?? n.color ?? 'default') as NoteColor,
      degree: d,
      isOrphan: d === 0,
    }
  })

  if (!filters.showOrphans) {
    nodes = nodes.filter((n) => !n.isOrphan)
  }

  return { nodes, links }
}

/** Mapa de vecinos (no dirigido) para el resaltado en hover */
export function buildNeighborMap(links: GraphLinkDatum[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  const add = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set())
    map.get(a)!.add(b)
  }
  for (const l of links) {
    const s = linkEndpointId(l.source)
    const t = linkEndpointId(l.target)
    add(s, t)
    add(t, s)
  }
  return map
}

/** Radio del nodo según grado: clamp(base, base + √grado·factor, max) */
export function radiusFor(degree: number): number {
  const r = GRAPH_NODE_RADIUS.base + Math.sqrt(degree) * GRAPH_NODE_RADIUS.factor
  return Math.min(GRAPH_NODE_RADIUS.max, Math.max(GRAPH_NODE_RADIUS.base, r))
}

export function truncateLabel(title: string): string {
  if (title.length <= GRAPH_LABEL_MAX_CHARS) return title
  return `${title.slice(0, GRAPH_LABEL_MAX_CHARS - 1)}…`
}

export function matchesSearch(title: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  return title.toLowerCase().includes(q)
}
