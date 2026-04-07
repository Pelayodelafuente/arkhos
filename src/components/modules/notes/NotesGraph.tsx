"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Filter, X, Circle, Link2 } from "lucide-react"
import { useNotesStore } from "@/stores/notes-store"
import { useToast } from "@/stores/ui-store"
import type { NoteColor, NoteFolder } from "@/types/notes"

// ForceGraph2D needs window — dynamic import con SSR desactivado
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false }
)

// ─── Color map ────────────────────────
const NOTE_COLOR_HEX: Record<NoteColor, string> = {
  default:    '#C8BFAF',
  sage:       '#B07A3A',
  terracotta: '#C4704A',
  stone:      '#888780',
  blue:       '#4A7A9B',
  gold:       '#9B7A4A',
}

// Colores asignados a carpetas (por índice)
const FOLDER_PALETTE = [
  '#C4704A', '#4A7A9B', '#B07A3A', '#9B7A4A',
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
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
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
  const editNote     = useNotesStore((s) => s.editNote)
  const syncBacklinksOnSave = useNotesStore((s) => s.syncBacklinksOnSave)
  const toast        = useToast()

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ folderId: null, tag: null, color: null })
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null)

  // Connect mode state
  const [connectMode, setConnectMode] = useState(false)
  const [connectSource, setConnectSource] = useState<string | null>(null)

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
  const graphData = useMemo<GraphData & { isolatedSet: Set<string> }>(() => {
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

    const links: GraphLink[] = backlinks
      .filter((bl) => noteIdSet.has(bl.source_note_id) && noteIdSet.has(bl.target_note_id))
      .map((bl) => ({ source: bl.source_note_id, target: bl.target_note_id }))

    // Compute isolated nodes (not in any link)
    const linkedSet = new Set<string>()
    for (const l of links) {
      linkedSet.add(typeof l.source === 'string' ? l.source : l.source.id)
      linkedSet.add(typeof l.target === 'string' ? l.target : l.target.id)
    }
    const isolatedSet = new Set<string>()
    for (const n of filteredNotes) {
      if (!linkedSet.has(n.id)) isolatedSet.add(n.id)
    }

    // Group nodes by folder for pre-layout (cluster initialization)
    const folderCentroids: Record<string, { x: number; y: number; count: number }> = {}
    const canvasW = 800
    const canvasH = 600
    const uniqueFolders = [...new Set(filteredNotes.map(n => n.folder_id).filter(Boolean))] as string[]
    uniqueFolders.forEach((fid, i) => {
      const angle = (i / uniqueFolders.length) * 2 * Math.PI
      const r = Math.min(canvasW, canvasH) * 0.25
      folderCentroids[fid] = {
        x: canvasW / 2 + r * Math.cos(angle),
        y: canvasH / 2 + r * Math.sin(angle),
        count: 0,
      }
    })

    const nodes: GraphNode[] = filteredNotes.map((n) => {
      const centroid = n.folder_id ? folderCentroids[n.folder_id] : null
      let initX: number | undefined
      let initY: number | undefined
      if (centroid) {
        const spread = 60
        initX = centroid.x + (Math.random() - 0.5) * spread
        initY = centroid.y + (Math.random() - 0.5) * spread
        centroid.count++
      }
      return {
        id: n.id,
        name: n.title || 'Sin título',
        color: n.folder_id ? (folderColorMap[n.folder_id] ?? NOTE_COLOR_HEX[n.color]) : NOTE_COLOR_HEX[n.color],
        val: Math.max(1, (backlinkCount[n.id] ?? 0) + 1),
        folder_id: n.folder_id ?? null,
        noteColor: n.color,
        tags: n.tags ?? [],
        ...(initX !== undefined ? { x: initX, y: initY } : {}),
      }
    })

    return { nodes, links, isolatedSet }
  }, [notes, backlinks, filters, folderColorMap])

  const { nodes: graphNodes, links: graphLinks, isolatedSet } = graphData
  const isolatedCount = isolatedSet.size

  // ForceGraph2D data (without the custom isolatedSet field)
  const fgData = useMemo(() => ({ nodes: graphNodes, links: graphLinks }), [graphNodes, graphLinks])

  // Dibujar etiqueta bajo el nodo
  const paintNode = useCallback((
    node: GraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const { x = 0, y = 0, val, color, name, id } = node
    const isIsolated = isolatedSet.has(id)
    const isHovered = id === hoverNodeId
    const isConnectSrc = id === connectSource

    const rawRadius = Math.sqrt(val) * 4
    // Isolated nodes are 20% smaller
    const radius = isIsolated ? rawRadius * 0.8 : rawRadius

    // Isolated: render at reduced opacity
    if (isIsolated) ctx.globalAlpha = 0.45

    // Círculo
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = isConnectSrc ? '#F5C842' : color
    ctx.fill()

    // Borde al hacer hover o cuando es la fuente de conexión
    if (isHovered || isConnectSrc) {
      ctx.strokeStyle = isConnectSrc ? '#D4A820' : '#1A1714'
      ctx.lineWidth = 1.5 / globalScale
      ctx.stroke()
    }

    // Reset alpha before drawing label
    if (isIsolated) ctx.globalAlpha = 1

    // Etiqueta — siempre visible, tamaño adaptativo
    const fontSize = Math.max(8, Math.min(11, 10 * globalScale))
    ctx.font = `${fontSize}px Plus Jakarta Sans, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = isIsolated ? '#AAAAAA' : '#3D3630'
    const label = name.length > 18 ? name.slice(0, 18) + '…' : name
    ctx.fillText(label, x, y + radius + 3)
  }, [hoverNodeId, isolatedSet, connectSource])

  // Handle node click — connect mode or regular
  const handleNodeClick = useCallback((node: object) => {
    const n = node as GraphNode
    if (!connectMode) {
      onNodeClick(n.id)
      return
    }
    if (!connectSource) {
      // First click: set source
      setConnectSource(n.id)
      return
    }
    if (n.id === connectSource) {
      // Clicked same node, deselect
      setConnectSource(null)
      return
    }
    // Second click: create link
    const sourceNote = notes.find((note) => note.id === connectSource)
    const targetNote = notes.find((note) => note.id === n.id)
    if (!sourceNote || !targetNote) return

    const targetTitle = targetNote.title || 'Sin título'
    const link = `[[${targetTitle}]]`
    const currentContent = sourceNote.content ?? ''
    if (!currentContent.includes(link)) {
      const newContent = currentContent + (currentContent.endsWith('\n') || !currentContent ? '' : '\n') + link
      editNote(connectSource, { content: newContent })
        .then(() => {
          syncBacklinksOnSave(connectSource!, newContent).catch(console.error)
          toast.success(`Nota vinculada a "${targetTitle}"`)
        })
        .catch(() => toast.error('Error al vincular notas'))
    } else {
      toast.info(`Ya existe el vínculo [[${targetTitle}]]`)
    }
    setConnectSource(null)
    setConnectMode(false)
  }, [connectMode, connectSource, notes, editNote, syncBacklinksOnSave, toast, onNodeClick])

  const noteColors: NoteColor[] = ['default', 'sage', 'terracotta', 'stone', 'blue', 'gold']
  const colorLabels: Record<NoteColor, string> = {
    default: 'Sin color',
    sage: 'Verde',
    terracotta: 'Terracota',
    stone: 'Piedra',
    blue: 'Azul',
    gold: 'Dorado',
  }

  return (
    <div className="flex h-full relative">
      {/* Graph canvas */}
      <div ref={containerRef} className="flex-1 min-w-0 bg-background relative overflow-hidden">
        {graphNodes.length === 0 ? (
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
            graphData={fgData}
            nodeId="id"
            nodeLabel="name"
            nodeCanvasObject={(node, ctx, globalScale) =>
              paintNode(node as unknown as GraphNode, ctx, globalScale)
            }
            nodeCanvasObjectMode={() => 'replace'}
            linkColor={() => '#E2D9CA'}
            linkWidth={1}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={0}
            backgroundColor="#FAF7F2"
            onNodeClick={handleNodeClick}
            onNodeHover={(node) => setHoverNodeId(node ? (node as unknown as GraphNode).id : null)}
            cooldownTicks={80}
            d3AlphaDecay={0.03}
            d3VelocityDecay={0.35}
          />
        )}

        {/* Connect mode instruction banner */}
        {connectMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2 shadow-sm text-xs text-text-secondary">
            <Link2 size={13} strokeWidth={1.75} className="text-accent flex-shrink-0" />
            {connectSource
              ? 'Ahora haz clic en la nota destino'
              : 'Haz clic en la nota origen'}
            <button
              onClick={() => { setConnectMode(false); setConnectSource(null) }}
              className="text-text-tertiary hover:text-foreground transition-colors ml-1"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Toolbar — connect button + filter button */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => {
              if (connectMode) { setConnectMode(false); setConnectSource(null) }
              else setConnectMode(true)
            }}
            title="Modo conectar notas"
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              connectMode
                ? 'bg-foreground text-card border-foreground'
                : 'bg-card border-border text-text-secondary hover:text-foreground'
            }`}
          >
            <Link2 size={13} strokeWidth={1.75} />
            Conectar
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
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
        </div>

        {/* Stats */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1">
          <div className="flex items-center gap-3 text-xs text-text-tertiary font-mono">
            <span>{graphNodes.length} notas</span>
            <span>·</span>
            <span>{graphLinks.length} conexiones</span>
            {isolatedCount > 0 && (
              <>
                <span>·</span>
                <span>{isolatedCount} aisladas</span>
              </>
            )}
          </div>
          {/* CTA for isolated nodes */}
          {isolatedCount > 2 && (
            <p className="text-[11px] text-text-tertiary max-w-xs">
              Conecta notas usando [[título]] en el editor o el modo Conectar
            </p>
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
                  {folders.map((folder: NoteFolder, i: number) => (
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
