"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useNotesStore } from "@/stores/notes-store"
import { CanvasNodeComponent } from "./CanvasNode"
import { CanvasEdgeComponent } from "./CanvasEdge"
import { CanvasToolbar } from "./CanvasToolbar"
import type { CanvasNode } from "@/types/notes"

const VIEWPORT_STORAGE_PREFIX = 'arkhos:canvas:'

interface Props {
  userId: string
  onEditNote: (noteId: string) => void
  onNewNote: (pos: { x: number; y: number }) => void
}

export function NotesCanvas({ userId, onEditNote, onNewNote }: Props) {
  const canvas = useNotesStore((s) => s.canvas)
  const nodes = useNotesStore((s) => s.canvasNodes)
  const edges = useNotesStore((s) => s.canvasEdges)
  const viewport = useNotesStore((s) => s.viewport)
  const setViewport = useNotesStore((s) => s.setViewport)
  const selectedNodeId = useNotesStore((s) => s.selectedNodeId)
  const setSelectedNode = useNotesStore((s) => s.setSelectedNode)
  const connectingFromNodeId = useNotesStore((s) => s.connectingFromNodeId)
  const setConnectingFrom = useNotesStore((s) => s.setConnectingFrom)
  const updateNodePos = useNotesStore((s) => s.updateNodePos)
  const persistNodePos = useNotesStore((s) => s.persistNodePos)
  const removeNode = useNotesStore((s) => s.removeNode)
  const removeEdge = useNotesStore((s) => s.removeEdge)
  const addEdge = useNotesStore((s) => s.addEdge)
  const fetchCanvas = useNotesStore((s) => s.fetchCanvas)

  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [connectingLine, setConnectingLine] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null)
  const connectingSideRef = useRef<string>('right')

  // Node map for edge lookups
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // Restore viewport from localStorage
  useEffect(() => {
    if (!canvas) return
    const key = `${VIEWPORT_STORAGE_PREFIX}${canvas.id}:viewport`
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const vp = JSON.parse(stored)
        setViewport(vp)
      }
    } catch { /* ignore */ }
  }, [canvas, setViewport])

  // Save viewport to localStorage
  useEffect(() => {
    if (!canvas) return
    const key = `${VIEWPORT_STORAGE_PREFIX}${canvas.id}:viewport`
    const t = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(viewport))
    }, 300)
    return () => clearTimeout(t)
  }, [viewport, canvas])

  // Load canvas data
  useEffect(() => {
    if (canvas) fetchCanvas(canvas.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas?.id])

  // ─── PAN ────────────────────
  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true)
    setPanStart({ x: clientX - viewport.offsetX, y: clientY - viewport.offsetY })
  }, [viewport.offsetX, viewport.offsetY])

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return
    setViewport({
      offsetX: clientX - panStart.x,
      offsetY: clientY - panStart.y,
    })
  }, [isPanning, panStart, setViewport])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
  }, [])

  // ─── NODE DRAG ──────────────
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent | React.TouchEvent) => {
    const node = nodeMap.get(nodeId)
    if (!node) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    setIsDraggingNode(true)
    setDragNodeId(nodeId)
    setDragOffset({
      x: clientX - (node.pos_x * viewport.scale + viewport.offsetX),
      y: clientY - (node.pos_y * viewport.scale + viewport.offsetY),
    })
  }, [nodeMap, viewport])

  const handleNodeDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingNode || !dragNodeId) return
    const newX = (clientX - dragOffset.x - viewport.offsetX) / viewport.scale
    const newY = (clientY - dragOffset.y - viewport.offsetY) / viewport.scale
    updateNodePos(dragNodeId, { x: newX, y: newY })
  }, [isDraggingNode, dragNodeId, dragOffset, viewport, updateNodePos])

  const handleNodeDragEnd = useCallback(() => {
    if (dragNodeId) {
      const node = nodeMap.get(dragNodeId)
      if (node) persistNodePos(dragNodeId, { x: node.pos_x, y: node.pos_y })
    }
    setIsDraggingNode(false)
    setDragNodeId(null)
  }, [dragNodeId, nodeMap, persistNodePos])

  // ─── CONNECTION DRAG ────────
  const handleConnectionStart = useCallback((nodeId: string, side: string) => {
    setConnectingFrom(nodeId)
    connectingSideRef.current = side
    const node = nodeMap.get(nodeId)
    if (!node) return
    const anchor = getScreenAnchor(node, side, viewport)
    setConnectingLine({ fromX: anchor.x, fromY: anchor.y, toX: anchor.x, toY: anchor.y })
  }, [nodeMap, viewport, setConnectingFrom])

  const handleConnectionMove = useCallback((clientX: number, clientY: number) => {
    if (!connectingFromNodeId || !connectingLine) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setConnectingLine((prev) => prev ? { ...prev, toX: clientX - rect.left, toY: clientY - rect.top } : null)
  }, [connectingFromNodeId, connectingLine])

  const handleConnectionEnd = useCallback((targetNodeId?: string) => {
    if (connectingFromNodeId && targetNodeId && connectingFromNodeId !== targetNodeId) {
      addEdge(connectingFromNodeId, targetNodeId)
    }
    setConnectingFrom(null)
    setConnectingLine(null)
  }, [connectingFromNodeId, addEdge, setConnectingFrom])

  // ─── MOUSE EVENTS ──────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setSelectedNode(null)
    setSelectedEdgeId(null)
    handlePanStart(e.clientX, e.clientY)
  }, [handlePanStart, setSelectedNode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingNode) {
      handleNodeDragMove(e.clientX, e.clientY)
    } else if (connectingFromNodeId) {
      handleConnectionMove(e.clientX, e.clientY)
    } else if (isPanning) {
      handlePanMove(e.clientX, e.clientY)
    }
  }, [isDraggingNode, connectingFromNodeId, isPanning, handleNodeDragMove, handleConnectionMove, handlePanMove])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDraggingNode) {
      handleNodeDragEnd()
    } else if (connectingFromNodeId) {
      // Check if mouse is over a node
      const target = document.elementFromPoint(e.clientX, e.clientY)
      const nodeEl = target?.closest('[data-node-id]')
      const targetId = nodeEl?.getAttribute('data-node-id')
      handleConnectionEnd(targetId ?? undefined)
    } else {
      handlePanEnd()
    }
  }, [isDraggingNode, connectingFromNodeId, handleNodeDragEnd, handleConnectionEnd, handlePanEnd])

  // ─── WHEEL ─────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      // Zoom toward cursor
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(Math.max(viewport.scale * delta, 0.1), 3)
      const ratio = newScale / viewport.scale
      setViewport({
        scale: newScale,
        offsetX: mouseX - (mouseX - viewport.offsetX) * ratio,
        offsetY: mouseY - (mouseY - viewport.offsetY) * ratio,
      })
    } else {
      // Pan
      setViewport({
        offsetX: viewport.offsetX - e.deltaX,
        offsetY: viewport.offsetY - e.deltaY,
      })
    }
  }, [viewport, setViewport])

  // ─── TOUCH EVENTS ──────────
  const touchRef = useRef<{ lastDist: number; lastCenter: { x: number; y: number } } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch = pan
      handlePanStart(e.touches[0].clientX, e.touches[0].clientY)
    } else if (e.touches.length === 2) {
      // Two fingers = zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current = {
        lastDist: Math.sqrt(dx * dx + dy * dy),
        lastCenter: {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        },
      }
    }
  }, [handlePanStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && !isDraggingNode) {
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY)
    } else if (isDraggingNode && e.touches.length === 1) {
      handleNodeDragMove(e.touches[0].clientX, e.touches[0].clientY)
    } else if (e.touches.length === 2 && touchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / touchRef.current.lastDist
      const newScale = Math.min(Math.max(viewport.scale * ratio, 0.1), 3)

      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
        const scaleRatio = newScale / viewport.scale
        setViewport({
          scale: newScale,
          offsetX: cx - (cx - viewport.offsetX) * scaleRatio,
          offsetY: cy - (cy - viewport.offsetY) * scaleRatio,
        })
      }
      touchRef.current.lastDist = dist
    }
  }, [isDraggingNode, viewport, handlePanMove, handleNodeDragMove, setViewport])

  const handleTouchEnd = useCallback(() => {
    if (isDraggingNode) handleNodeDragEnd()
    else handlePanEnd()
    touchRef.current = null
  }, [isDraggingNode, handleNodeDragEnd, handlePanEnd])

  // ─── DOUBLE CLICK ──────────
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const worldX = (e.clientX - rect.left - viewport.offsetX) / viewport.scale
    const worldY = (e.clientY - rect.top - viewport.offsetY) / viewport.scale
    onNewNote({ x: worldX, y: worldY })
  }, [viewport, onNewNote])

  // ─── NODE DOUBLE CLICK ─────
  const handleNodeDoubleClick = useCallback((node: CanvasNode) => {
    if (node.node_type === 'note' && node.note_id) {
      onEditNote(node.note_id)
    }
  }, [onEditNote])

  // ─── FIT ALL ───────────────
  const fitAllNodes = useCallback(() => {
    if (nodes.length === 0) {
      setViewport({ offsetX: 0, offsetY: 0, scale: 1 })
      return
    }
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.pos_x)
      minY = Math.min(minY, n.pos_y)
      maxX = Math.max(maxX, n.pos_x + n.width)
      maxY = Math.max(maxY, n.pos_y + n.height)
    }

    const padding = 60
    const contentW = maxX - minX + padding * 2
    const contentH = maxY - minY + padding * 2
    const scaleX = rect.width / contentW
    const scaleY = rect.height / contentH
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 2)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setViewport({
      scale: newScale,
      offsetX: rect.width / 2 - centerX * newScale,
      offsetY: rect.height / 2 - centerY * newScale,
    })
  }, [nodes, setViewport])

  // ─── NEW NOTE in center ────
  const handleNewNote = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const worldX = (rect.width / 2 - viewport.offsetX) / viewport.scale
    const worldY = (rect.height / 2 - viewport.offsetY) / viewport.scale
    onNewNote({ x: worldX, y: worldY })
  }, [viewport, onNewNote])

  // ─── KEYBOARD ──────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault()
        removeNode(selectedNodeId)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId) {
        e.preventDefault()
        removeEdge(selectedEdgeId)
        setSelectedEdgeId(null)
      }
      if (e.key === 'Escape') {
        setSelectedNode(null)
        setSelectedEdgeId(null)
        setConnectingFrom(null)
        setConnectingLine(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault()
        setViewport({ scale: Math.min(viewport.scale * 1.2, 3) })
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        setViewport({ scale: Math.max(viewport.scale / 1.2, 0.1) })
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '0') {
        e.preventDefault()
        fitAllNodes()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNodeId, selectedEdgeId, viewport.scale, removeNode, removeEdge, setSelectedNode, setConnectingFrom, setViewport, fitAllNodes])

  const cursor = isDraggingNode ? 'grabbing' : isPanning ? 'grabbing' : connectingFromNodeId ? 'crosshair' : 'grab'

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl border border-border overflow-hidden"
      style={{ height: 'calc(100vh - 200px)', cursor, touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      {/* Grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <pattern id="grid" width={20 * viewport.scale} height={20 * viewport.scale}
            x={viewport.offsetX % (20 * viewport.scale)} y={viewport.offsetY % (20 * viewport.scale)}
            patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.5} fill="rgba(0,0,0,0.06)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="var(--bg-cream)" />
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Edges SVG layer */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: 'none' }}>
        <g style={{ pointerEvents: 'auto' }}>
          {edges.map((edge) => (
            <CanvasEdgeComponent
              key={edge.id}
              edge={edge}
              nodes={nodeMap}
              scale={viewport.scale}
              offsetX={viewport.offsetX}
              offsetY={viewport.offsetY}
              isSelected={selectedEdgeId === edge.id}
              onSelect={(id) => { setSelectedEdgeId(id); setSelectedNode(null) }}
              onDelete={removeEdge}
            />
          ))}
        </g>
        {/* Connecting line */}
        {connectingLine && (
          <line
            x1={connectingLine.fromX}
            y1={connectingLine.fromY}
            x2={connectingLine.toX}
            y2={connectingLine.toY}
            stroke="#7a9b76"
            strokeWidth={2}
            strokeDasharray="6 3"
            opacity={0.7}
          />
        )}
      </svg>

      {/* Nodes HTML layer */}
      <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: 'none' }}>
        {nodes.map((node) => (
          <div key={node.id} data-node-id={node.id} style={{ pointerEvents: 'auto' }}>
            <CanvasNodeComponent
              node={node}
              scale={viewport.scale}
              offsetX={viewport.offsetX}
              offsetY={viewport.offsetY}
              isSelected={selectedNodeId === node.id}
              onSelect={setSelectedNode}
              onDragStart={handleNodeDragStart}
              onDoubleClick={handleNodeDoubleClick}
              onConnectionStart={handleConnectionStart}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 3, pointerEvents: 'none' }}>
          <div className="rounded-xl bg-card/80 backdrop-blur-sm border border-border px-8 py-6 text-center max-w-xs">
            <p className="text-sm text-text-secondary mb-1 font-medium">Canvas vacio</p>
            <p className="text-xs text-text-tertiary">
              Doble click para crear una nota. Usa el boton + del toolbar
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <CanvasToolbar onNewNote={handleNewNote} onFitAll={fitAllNodes} />
    </div>
  )
}

function getScreenAnchor(node: CanvasNode, side: string, viewport: { scale: number; offsetX: number; offsetY: number }) {
  const x = node.pos_x * viewport.scale + viewport.offsetX
  const y = node.pos_y * viewport.scale + viewport.offsetY
  const w = node.width * viewport.scale
  const h = node.height * viewport.scale
  switch (side) {
    case 'top': return { x: x + w / 2, y }
    case 'bottom': return { x: x + w / 2, y: y + h }
    case 'left': return { x, y: y + h / 2 }
    case 'right': return { x: x + w, y: y + h / 2 }
    default: return { x: x + w, y: y + h / 2 }
  }
}
