// ══════════════════════════════════════
// Arkhos — Tests del modelo del grafo de Notas (funciones puras)
// ══════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  buildGraph,
  buildNeighborMap,
  radiusFor,
  truncateLabel,
  matchesSearch,
  linkEndpointId,
} from '@/components/modules/notes/graph/graph-model'
import { GRAPH_NODE_RADIUS } from '@/components/modules/notes/graph/graph-constants'
import type { Note, NoteFolder } from '@/types/notes'
import type { NoteBacklinkPair } from '@/stores/notes/types'

function makeNote(overrides: Partial<Note> & { id: string; title: string }): Note {
  return {
    user_id: 'u1',
    content: '',
    contentLoaded: false,
    color: 'default',
    icon: null,
    is_pinned: false,
    word_count: 0,
    tags: [],
    sort_order: 0,
    folder_id: null,
    archived: false,
    favorited: false,
    deleted_at: null,
    status: 'none',
    project_id: null,
    subscription_id: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as Note
}

function makeFolder(id: string, color: NoteFolder['color']): NoteFolder {
  return {
    id,
    user_id: 'u1',
    name: `Carpeta ${id}`,
    icon: 'Folder',
    color,
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  }
}

const NOTES: Note[] = [
  makeNote({ id: 'a', title: 'Alfa', folder_id: 'f1' }),
  makeNote({ id: 'b', title: 'Beta', color: 'blue' }),
  makeNote({ id: 'c', title: 'Gamma' }),
  makeNote({ id: 'd', title: 'Delta huérfana' }),
]

const BACKLINKS: NoteBacklinkPair[] = [
  { source_note_id: 'a', target_note_id: 'b' },
  { source_note_id: 'b', target_note_id: 'c' },
  { source_note_id: 'a', target_note_id: 'b' }, // duplicado exacto
  { source_note_id: 'c', target_note_id: 'c' }, // self-link
  { source_note_id: 'a', target_note_id: 'zz' }, // destino inexistente
]

const FOLDERS: NoteFolder[] = [makeFolder('f1', 'terracotta')]

const ALL = { folderId: null, showOrphans: true }

describe('buildGraph', () => {
  it('crea un nodo por nota y descarta enlaces inválidos (dup/self/huérfano de destino)', () => {
    const { nodes, links } = buildGraph(NOTES, BACKLINKS, FOLDERS, ALL)
    expect(nodes).toHaveLength(4)
    expect(links).toHaveLength(2) // a→b y b→c
  })

  it('calcula el grado y marca huérfanas', () => {
    const { nodes } = buildGraph(NOTES, BACKLINKS, FOLDERS, ALL)
    const byId = new Map(nodes.map((n) => [n.id, n]))
    expect(byId.get('b')?.degree).toBe(2)
    expect(byId.get('a')?.degree).toBe(1)
    expect(byId.get('d')?.degree).toBe(0)
    expect(byId.get('d')?.isOrphan).toBe(true)
    expect(byId.get('b')?.isOrphan).toBe(false)
  })

  it('el color del nodo sale de la carpeta y cae al color de la nota', () => {
    const { nodes } = buildGraph(NOTES, BACKLINKS, FOLDERS, ALL)
    const byId = new Map(nodes.map((n) => [n.id, n]))
    expect(byId.get('a')?.colorKey).toBe('terracotta') // carpeta f1
    expect(byId.get('b')?.colorKey).toBe('blue') // color propio
    expect(byId.get('c')?.colorKey).toBe('default')
  })

  it('oculta huérfanas cuando showOrphans es false', () => {
    const { nodes } = buildGraph(NOTES, BACKLINKS, FOLDERS, { ...ALL, showOrphans: false })
    expect(nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('filtra por carpeta y descarta enlaces con extremos fuera del filtro', () => {
    const { nodes, links } = buildGraph(NOTES, BACKLINKS, FOLDERS, {
      folderId: 'f1',
      showOrphans: true,
    })
    expect(nodes.map((n) => n.id)).toEqual(['a'])
    expect(links).toHaveLength(0) // b quedó fuera → a→b no aplica
  })
})

describe('buildNeighborMap', () => {
  it('construye vecindad no dirigida', () => {
    const { links } = buildGraph(NOTES, BACKLINKS, FOLDERS, ALL)
    const map = buildNeighborMap(links)
    expect(map.get('a')?.has('b')).toBe(true)
    expect(map.get('b')?.has('a')).toBe(true)
    expect(map.get('b')?.has('c')).toBe(true)
    expect(map.get('d')).toBeUndefined()
  })
})

describe('radiusFor', () => {
  it('respeta el mínimo y el máximo', () => {
    expect(radiusFor(0)).toBe(GRAPH_NODE_RADIUS.base)
    expect(radiusFor(1)).toBeGreaterThan(GRAPH_NODE_RADIUS.base)
    expect(radiusFor(1000)).toBe(GRAPH_NODE_RADIUS.max)
  })
})

describe('helpers', () => {
  it('truncateLabel corta títulos largos con elipsis', () => {
    expect(truncateLabel('Corto')).toBe('Corto')
    const long = 'Un título larguísimo que no cabe en el nodo'
    expect(truncateLabel(long).length).toBeLessThanOrEqual(18)
    expect(truncateLabel(long).endsWith('…')).toBe(true)
  })

  it('matchesSearch ignora mayúsculas y espacios', () => {
    expect(matchesSearch('Mi Nota Importante', 'importante')).toBe(true)
    expect(matchesSearch('Mi Nota', '  ')).toBe(false)
    expect(matchesSearch('Mi Nota', 'otra')).toBe(false)
  })

  it('linkEndpointId resuelve string y datum', () => {
    expect(linkEndpointId('x')).toBe('x')
    expect(
      linkEndpointId({ id: 'y', title: '', colorKey: 'default', degree: 0, isOrphan: true })
    ).toBe('y')
  })
})
