"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Filter, X, Circle } from "lucide-react"
import { useNotesStore } from "@/stores/notes-store"
import type { NoteColor, NoteFolder } from "@/types/notes"

// ForceGraph2D needs window — dynamic import con SSR desactivado
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false }
)

// ─── Color map ────────────────────────
const NOTE_COLOR_HEX: Record<NoteColor, string> = {
  default:    '#C8BFAF',
  sage:       '#7a9b76',
  terracotta: '#C4704A',
  stone:      '#888780',
  blue:       '#4A7A9B',
  gold:       '#9B7A4A',
}

// Colores asignados a carpetas (por índice)
const FOLDER_PALETTE = [
  '#C4704A', '#4A7A9B', '#7a9b76', '#9B7A4A',
  '#888780', '#5B8C6A', '#7A4A9B', '#9B4A5B',
]

interface GraphNode {
  id: string
  name: string
  color: string
  val: number        // tamaño del nodo
  folder_id: string | null
  noteColor: NoteColor
  tags: string[]
}

interface GraphLink {
  source: string
  target: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface FilterState {
  folderId: string | null
  tag: string | null
  color: NoteColor | null
}

interface Props {
  onNodeClick: (noteId: string) => void
}

export function NotesGraph({ onNodeClick }: Props) {
  const notes        = useNotesStore((s) => s.notes)
  const backlinks    = useNotesStore((s) => s.graphBacklinks)
  const folders      = useNotesStore((s) => s.folders)
  const loadGraphData = useNotesStore((s) => s.loadGraphData)

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ folderId: null, tag: null, color: null })
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null)

  // Carga backlinks al montar
  useEffect(() => {
    loadGraphData()
  }, [loadGraphData])

  // Medir el contenedor
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Mapa folderId → color
  const folderColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    folders.forEach((f, i) => {
      map[f.id] = FOLDER_PALETTE[i % FOLDER_PALETTE.length]
    })
    return map
  }, [folders])

  // Todos los tags únicos en las notas
  const allTags = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => n.tags?.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [notes])

  // Construir graphData aplicando filtros
  const graphData = useMemo<GraphData>(() => {
    // Filtrar notas
    const filteredNotes = notes.filter((n) => {
      if (n.deleted_at) return false
      if (filters.folderId && n.folder_id !== filters.folderId) return false
      if (filters.tag && !n.tags?.includes(filters.tag)) return false
      if (filters.color && n.color !== filters.color) return false
      return true
    })
    const noteIdSet = new Set(filteredNotes.map((n) => n.id))

    // Contar backlinks por nota (para el tamaño)
    const backlinkCount: Record<string, number> = {}
    for (const bl of backlinks) {
      if (noteIdSet.has(bl.target_note_id)) {
        backlinkCount[bl.target_note_id] = (backlinkCount[bl.target_note_id] ?? 0) + 1
      }
    }

    const nodes: GraphNode[] = filteredNotes.map((n) => ({
      id: n.id,
      name: n.title || 'Sin título',
      color: n.folder_id ? (folderColorMap[n.folder_id] ?? NOTE_COLOR_HEX[n.color]) : NOTE_COLOR_HEX[n.color],
      val: Math.max(1, (backlinkCount[n.id] ?? 0) + 1),
      folder_id: n.folder_id ?? null,
      noteColor: n.color,
      tags: n.tags ?? [],
    }))

    const links: GraphLink[] = backlinks
      .filter((bl) => noteIdSet.has(bl.source_note_id) && noteIdSet.has(bl.target_note_id))
      .map((bl) => ({ source: bl.source_note_id, target: bl.target_note_id }))

    return { nodes, links }
  }, [notes, backlinks, filters, folderColorMap])

  // Dibujar etiqueta bajo el nodo
  const paintNode = useCallback((
    node: GraphNode & { x?: number; y?: number },
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const { x = 0, y = 0, val, color, name, id } = node
    const radius = Math.sqrt(val) * 4
    const isHovered = id === hoverNodeId

    // Círculo
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()

    // Borde al hacer hover
    if (isHovered) {
      ctx.strokeStyle = '#1A1714'
      ctx.lineWidth = 1.5 / globalScale
      ctx.stroke()
    }

    // Etiqueta (visible a partir de cierto zoom)
    if (globalScale >= 0.6) {
      const fontSize = Math.max(8, 11 / globalScale)
      ctx.font = `${fontSize}px Plus Jakarta Sans, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#3D3630'
      const label = name.length > 22 ? name.slice(0, 20) + '…' : name
      ctx.fillText(label, x, y + radius + 3)
    }
  }, [hoverNodeId])

  const noteColors: NoteColor[] = ['default', 'sage', 'terracotta', 'stone', 'blue', 'gold']
  const colorLabels: Record<NoteColor, string> = {
    default: 'Sin color',
    sage: 'Verde',
    terracotta: 'Terracota',
    stone: 'Piedra',
    blue: 'Azul',
    gold: 'Dorado',
  }

  const isolatedCount = graphData.nodes.filter((n) => {
    const linkedIds = new Set([
      ...graphData.links.map((l) => typeof l.source === 'string' ? l.source : (l.source as GraphNode).id),
      ...graphData.links.map((l) => typeof l.target === 'string' ? l.target : (l.target as GraphNode).id),
    ])
    return !linkedIds.has(n.id)
  }).length

  return (
    <div className="flex h-full relative">
      {/* Graph canvas */}
      <div ref={containerRef} className="flex-1 min-w-0 bg-background relative overflow-hidden">
        {graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-tertiary">
            <Circle size={48} strokeWidth={1} />
            <p className="text-sm">No hay notas que mostrar</p>
            {(filters.folderId || filters.tag || filters.color) && (
              <button
                onClick={() => setFilters({ folderId: null, tag: null, color: null })}
                className="text-xs text-accent hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeId="id"
            nodeLabel="name"
            nodeCanvasObject={(node, ctx, globalScale) =>
              paintNode(node as unknown as GraphNode & { x?: number; y?: number }, ctx, globalScale)
            }
            nodeCanvasObjectMode={() => 'replace'}
            linkColor={() => '#E2D9CA'}
            linkWidth={1}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={0}
            backgroundColor="#FAF7F2"
            onNodeClick={(node) => onNodeClick((node as unknown as GraphNode).id)}
            onNodeHover={(node) => setHoverNodeId(node ? (node as unknown as GraphNode).id : null)}
            cooldownTicks={80}
            d3AlphaDecay={0.03}
            d3VelocityDecay={0.35}
          />
        )}

        {/* Botón filtros */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`absolute top-4 right-4 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            showFilters || filters.folderId || filters.tag || filters.color
              ? 'bg-foreground text-card border-foreground'
              : 'bg-card border-border text-text-secondary hover:text-foreground'
          }`}
        >
          <Filter size={13} strokeWidth={1.75} />
          Filtros
          {(filters.folderId || filters.tag || filters.color) && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-card text-[10px] font-semibold">
              {[filters.folderId, filters.tag, filters.color].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Stats */}
        <div className="absolute bottom-4 left-4 flex items-center gap-3 text-xs text-text-tertiary font-mono">
          <span>{graphData.nodes.length} notas</span>
          <span>·</span>
          <span>{graphData.links.length} conexiones</span>
          {isolatedCount > 0 && (
            <>
              <span>·</span>
              <span>{isolatedCount} aisladas</span>
            </>
          )}
        </div>
      </div>

      {/* Panel filtros */}
      {showFilters && (
        <div className="w-64 flex-shrink-0 border-l border-border bg-card flex flex-col animate-slide-in-right">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Filtros</span>
            <button onClick={() => setShowFilters(false)} className="text-text-tertiary hover:text-foreground transition-colors">
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Filtro por carpeta */}
            {folders.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">Carpeta</p>
                <div className="space-y-1">
                  <button
                    onClick={() => setFilters((f) => ({ ...f, folderId: null }))}
                    className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                      !filters.folderId ? 'bg-sand text-foreground font-medium' : 'text-text-secondary hover:bg-sand'
                    }`}
                  >
                    Todas
                  </button>
                  {folders.map((folder, i) => (
                    <button
                      key={folder.id}
                      onClick={() => setFilters((f) => ({ ...f, folderId: f.folderId === folder.id ? null : folder.id }))}
                      className={`w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 ${
                        filters.folderId === folder.id ? 'bg-sand text-foreground font-medium' : 'text-text-secondary hover:bg-sand'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: FOLDER_PALETTE[i % FOLDER_PALETTE.length] }}
                      />
                      {folder.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro por color */}
            <div>
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {noteColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilters((f) => ({ ...f, color: f.color === c ? null : c }))}
                    title={colorLabels[c]}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      filters.color === c ? 'border-foreground scale-110' : 'border-border hover:border-text-tertiary'
                    }`}
                    style={{ backgroundColor: NOTE_COLOR_HEX[c] }}
                  />
                ))}
              </div>
            </div>

            {/* Filtro por tag */}
            {allTags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">Tag</p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setFilters((f) => ({ ...f, tag: f.tag === tag ? null : tag }))}
                      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                        filters.tag === tag
                          ? 'bg-foreground text-card'
                          : 'bg-sand text-text-secondary hover:text-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Limpiar */}
            {(filters.folderId || filters.tag || filters.color) && (
              <button
                onClick={() => setFilters({ folderId: null, tag: null, color: null })}
                className="w-full text-xs text-text-tertiary hover:text-foreground transition-colors text-center py-1"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
