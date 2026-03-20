"use client"

import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { useNotesStore } from "@/stores/notes-store"
import { CanvasNodeComponent } from "./CanvasNode"
import { CanvasEdgeComponent } from "./CanvasEdge"
import { CanvasToolbar } from "./CanvasToolbar"
import { CanvasMinimap } from "./CanvasMinimap"
import { CanvasContextMenu } from "./CanvasContextMenu"
import type { CanvasNode, CanvasViewport, SnapGuide } from "@/types/notes"

const VIEWPORT_STORAGE_PREFIX = "arkhos:canvas:"
const SNAP_THRESHOLD = 8
const MIN_NODE_W = 150
const MIN_NODE_H = 80

interface Props {
  userId: string
  onEditNote: (noteId: string) => void
  onNewNote: (pos: { x: number; y: number }) => void
}

export function NotesCanvas({ userId, onEditNote, onNewNote }: Props) {
  // ─── Store ──────────────────────────
  const canvas = useNotesStore((s) => s.canvas)
  const nodes = useNotesStore((s) => s.canvasNodes)
  const edges = useNotesStore((s) => s.canvasEdges)
  const viewport = useNotesStore((s) => s.viewport)
  const setViewport = useNotesStore((s) => s.setViewport)
  const selectedNodeIds = useNotesStore((s) => s.selectedNodeIds)
  const selectedEdgeId = useNotesStore((s) => s.selectedEdgeId)
  const selectNode = useNotesStore((s) => s.selectNode)
  const deselectAll = useNotesStore((s) => s.deselectAll)
  const selectNodesInRect = useNotesStore((s) => s.selectNodesInRect)
  const setSelectedEdge = useNotesStore((s) => s.setSelectedEdge)
  const connectingFromNodeId = useNotesStore((s) => s.connectingFromNodeId)
  const setConnectingFrom = useNotesStore((s) => s.setConnectingFrom)
  const updateNodePos = useNotesStore((s) => s.updateNodePos)
  const persistNodePos = useNotesStore((s) => s.persistNodePos)
  const moveSelectedNodes = useNotesStore((s) => s.moveSelectedNodes)
  const persistSelectedNodePositions = useNotesStore((s) => s.persistSelectedNodePositions)
  const removeSelectedNodes = useNotesStore((s) => s.removeSelectedNodes)
  const removeNode = useNotesStore((s) => s.removeNode)
  const removeEdge = useNotesStore((s) => s.removeEdge)
  const addEdge = useNotesStore((s) => s.addEdge)
  const addTextNode = useNotesStore((s) => s.addTextNode)
  const addGroupNode = useNotesStore((s) => s.addGroupNode)
  const fetchCanvas = useNotesStore((s) => s.fetchCanvas)
  const syncNotesToCanvas = useNotesStore((s) => s.syncNotesToCanvas)
  const snapEnabled = useNotesStore((s) => s.snapEnabled)
  const toggleSnap = useNotesStore((s) => s.toggleSnap)
  const snapGuides = useNotesStore((s) => s.snapGuides)
  const setSnapGuides = useNotesStore((s) => s.setSnapGuides)
  const editingNodeId = useNotesStore((s) => s.editingNodeId)
  const setEditingNode = useNotesStore((s) => s.setEditingNode)
  const updateNodeContent = useNotesStore((s) => s.updateNodeContent)
  const updateNodeSize = useNotesStore((s) => s.updateNodeSize)
  const toggleNodeLocked = useNotesStore((s) => s.toggleNodeLocked)
  const rubberBand = useNotesStore((s) => s.rubberBand)
  const setRubberBand = useNotesStore((s) => s.setRubberBand)

  // ─── Refs & local state ─────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isRubberBanding, setIsRubberBanding] = useState(false)
  const [connectingLine, setConnectingLine] = useState<{
    fromX: number; fromY: number; toX: number; toY: number
  } | null>(null)
  const connectingSideRef = useRef<string>("right")
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; worldX: number; worldY: number; nodeId: string | null
  } | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{
    nodeId: string; handle: string; startX: number; startY: number
    origX: number; origY: number; origW: number; origH: number
  } | null>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const hasAutoFitted = useRef(false)
  const [isMultiDrag, setIsMultiDrag] = useState(false)
  const lastDragPos = useRef({ x: 0, y: 0 })

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // ─── Container size ─────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ─── Restore viewport ──────────────
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

  // ─── Save viewport ─────────────────
  useEffect(() => {
    if (!canvas) return
    const key = `${VIEWPORT_STORAGE_PREFIX}${canvas.id}:viewport`
    const t = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(viewport))
    }, 300)
    return () => clearTimeout(t)
  }, [viewport, canvas])

  // ─── Load canvas + sync ─────────────
  useEffect(() => {
    if (!canvas) return
    let cancelled = false
    const load = async () => {
      await fetchCanvas(canvas.id)
      if (!cancelled) {
        await syncNotesToCanvas(userId)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas?.id])

  // ─── Auto-fit on first load ─────────
  useEffect(() => {
    if (hasAutoFitted.current || nodes.length === 0 || containerSize.w === 0) return
    hasAutoFitted.current = true
    requestAnimationFrame(() => fitAllNodes())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, containerSize.w])

  // ─── Snap guides calculation ────────
  const calculateSnapGuides = useCallback((
    movingId: string, x: number, y: number, w: number, h: number
  ): { guides: SnapGuide[]; snappedX: number; snappedY: number } => {
    if (!snapEnabled) return { guides: [], snappedX: x, snappedY: y }

    const guides: SnapGuide[] = []
    let snappedX = x
    let snappedY = y
    const movingCenterX = x + w / 2
    const movingCenterY = y + h / 2
    const movingRight = x + w
    const movingBottom = y + h

    for (const other of nodes) {
      if (other.id === movingId) continue
      if (selectedNodeIds.has(other.id)) continue

      const oCenterX = other.pos_x + other.width / 2
      const oCenterY = other.pos_y + other.height / 2
      const oRight = other.pos_x + other.width
      const oBottom = other.pos_y + other.height

      const vChecks = [
        { a: x, b: other.pos_x },
        { a: movingCenterX, b: oCenterX },
        { a: movingRight, b: oRight },
        { a: x, b: oRight },
        { a: movingRight, b: other.pos_x },
      ]
      for (const { a, b } of vChecks) {
        if (Math.abs(a - b) < SNAP_THRESHOLD) {
          snappedX = x + (b - a)
          guides.push({ orientation: "vertical", position: b })
          break
        }
      }

      const hChecks = [
        { a: y, b: other.pos_y },
        { a: movingCenterY, b: oCenterY },
        { a: movingBottom, b: oBottom },
        { a: y, b: oBottom },
        { a: movingBottom, b: other.pos_y },
      ]
      for (const { a, b } of hChecks) {
        if (Math.abs(a - b) < SNAP_THRESHOLD) {
          snappedY = y + (b - a)
          guides.push({ orientation: "horizontal", position: b })
          break
        }
      }
    }

    return { guides, snappedX, snappedY }
  }, [nodes, snapEnabled, selectedNodeIds])

  // ─── PAN ────────────────────────────
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

  // ─── NODE DRAG ──────────────────────
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent | React.TouchEvent) => {
    const node = nodeMap.get(nodeId)
    if (!node || node.locked) return

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    if (selectedNodeIds.has(nodeId) && selectedNodeIds.size > 1) {
      setIsMultiDrag(true)
      lastDragPos.current = { x: clientX, y: clientY }
      setIsDraggingNode(true)
      setDragNodeId(nodeId)
      return
    }

    setIsMultiDrag(false)
    setIsDraggingNode(true)
    setDragNodeId(nodeId)
    setDragOffset({
      x: clientX - (node.pos_x * viewport.scale + viewport.offsetX),
      y: clientY - (node.pos_y * viewport.scale + viewport.offsetY),
    })
  }, [nodeMap, viewport, selectedNodeIds])

  const handleNodeDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingNode || !dragNodeId) return

    if (isMultiDrag) {
      const dx = (clientX - lastDragPos.current.x) / viewport.scale
      const dy = (clientY - lastDragPos.current.y) / viewport.scale
      lastDragPos.current = { x: clientX, y: clientY }
      moveSelectedNodes(dx, dy)
      setSnapGuides([])
      return
    }

    const node = nodeMap.get(dragNodeId)
    if (!node) return

    let newX = (clientX - dragOffset.x - viewport.offsetX) / viewport.scale
    let newY = (clientY - dragOffset.y - viewport.offsetY) / viewport.scale

    if (snapEnabled) {
      const { guides, snappedX, snappedY } = calculateSnapGuides(
        dragNodeId, newX, newY, node.width, node.height
      )
      newX = snappedX
      newY = snappedY
      setSnapGuides(guides)
    }

    updateNodePos(dragNodeId, { x: newX, y: newY })
  }, [isDraggingNode, dragNodeId, isMultiDrag, dragOffset, viewport, nodeMap, snapEnabled, calculateSnapGuides, updateNodePos, moveSelectedNodes, setSnapGuides])

  const handleNodeDragEnd = useCallback(() => {
    if (dragNodeId) {
      if (isMultiDrag) {
        persistSelectedNodePositions()
      } else {
        const node = nodeMap.get(dragNodeId)
        if (node) persistNodePos(dragNodeId, { x: node.pos_x, y: node.pos_y })
      }
    }
    setIsDraggingNode(false)
    setDragNodeId(null)
    setIsMultiDrag(false)
    setSnapGuides([])
  }, [dragNodeId, isMultiDrag, nodeMap, persistNodePos, persistSelectedNodePositions, setSnapGuides])

  // ─── RESIZE ─────────────────────────
  const handleResizeStart = useCallback((nodeId: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const node = nodeMap.get(nodeId)
    if (!node || node.locked) return
    setIsResizing(true)
    resizeRef.current = {
      nodeId, handle,
      startX: e.clientX, startY: e.clientY,
      origX: node.pos_x, origY: node.pos_y,
      origW: node.width, origH: node.height,
    }
  }, [nodeMap])

  const handleResizeMove = useCallback((clientX: number, clientY: number) => {
    if (!isResizing || !resizeRef.current) return
    const { nodeId, handle, startX, startY, origX, origY, origW, origH } = resizeRef.current
    const dx = (clientX - startX) / viewport.scale
    const dy = (clientY - startY) / viewport.scale

    let newX = origX, newY = origY, newW = origW, newH = origH

    if (handle.includes("e")) newW = Math.max(MIN_NODE_W, origW + dx)
    if (handle.includes("w")) { newW = Math.max(MIN_NODE_W, origW - dx); newX = origX + origW - newW }
    if (handle.includes("s")) newH = Math.max(MIN_NODE_H, origH + dy)
    if (handle.includes("n")) { newH = Math.max(MIN_NODE_H, origH - dy); newY = origY + origH - newH }

    updateNodePos(nodeId, { x: newX, y: newY })
    updateNodeSize(nodeId, { width: newW, height: newH })
  }, [isResizing, viewport.scale, updateNodePos, updateNodeSize])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    resizeRef.current = null
  }, [])

  // ─── CONNECTION DRAG ────────────────
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

  // ─── RUBBER BAND ────────────────────
  const handleRubberBandStart = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const wx = (clientX - rect.left - viewport.offsetX) / viewport.scale
    const wy = (clientY - rect.top - viewport.offsetY) / viewport.scale
    setRubberBand({ startX: wx, startY: wy, currentX: wx, currentY: wy })
    setIsRubberBanding(true)
  }, [viewport, setRubberBand])

  const handleRubberBandMove = useCallback((clientX: number, clientY: number) => {
    if (!isRubberBanding || !rubberBand) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const wx = (clientX - rect.left - viewport.offsetX) / viewport.scale
    const wy = (clientY - rect.top - viewport.offsetY) / viewport.scale
    setRubberBand({ ...rubberBand, currentX: wx, currentY: wy })

    const x = Math.min(rubberBand.startX, wx)
    const y = Math.min(rubberBand.startY, wy)
    const w = Math.abs(wx - rubberBand.startX)
    const h = Math.abs(wy - rubberBand.startY)
    selectNodesInRect({ x, y, width: w, height: h })
  }, [isRubberBanding, rubberBand, viewport, setRubberBand, selectNodesInRect])

  const handleRubberBandEnd = useCallback(() => {
    setIsRubberBanding(false)
    setRubberBand(null)
  }, [setRubberBand])

  // ─── MOUSE EVENTS ──────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) return
    if (e.button !== 0) return
    setContextMenu(null)
    deselectAll()
    setEditingNode(null)

    if (e.shiftKey) {
      handleRubberBandStart(e.clientX, e.clientY)
    } else {
      handlePanStart(e.clientX, e.clientY)
    }
  }, [handlePanStart, handleRubberBandStart, deselectAll, setEditingNode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isResizing) {
      handleResizeMove(e.clientX, e.clientY)
    } else if (isDraggingNode) {
      handleNodeDragMove(e.clientX, e.clientY)
    } else if (connectingFromNodeId) {
      handleConnectionMove(e.clientX, e.clientY)
    } else if (isRubberBanding) {
      handleRubberBandMove(e.clientX, e.clientY)
    } else if (isPanning) {
      handlePanMove(e.clientX, e.clientY)
    }
  }, [isResizing, isDraggingNode, connectingFromNodeId, isRubberBanding, isPanning,
      handleResizeMove, handleNodeDragMove, handleConnectionMove, handleRubberBandMove, handlePanMove])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isResizing) {
      handleResizeEnd()
    } else if (isDraggingNode) {
      handleNodeDragEnd()
    } else if (connectingFromNodeId) {
      const target = document.elementFromPoint(e.clientX, e.clientY)
      const nodeEl = target?.closest("[data-node-id]")
      const targetId = nodeEl?.getAttribute("data-node-id")
      handleConnectionEnd(targetId ?? undefined)
    } else if (isRubberBanding) {
      handleRubberBandEnd()
    } else {
      handlePanEnd()
    }
  }, [isResizing, isDraggingNode, connectingFromNodeId, isRubberBanding,
      handleResizeEnd, handleNodeDragEnd, handleConnectionEnd, handleRubberBandEnd, handlePanEnd])

  // ─── RIGHT CLICK ────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const worldX = (e.clientX - rect.left - viewport.offsetX) / viewport.scale
    const worldY = (e.clientY - rect.top - viewport.offsetY) / viewport.scale

    const target = document.elementFromPoint(e.clientX, e.clientY)
    const nodeEl = target?.closest("[data-node-id]")
    const nodeId = nodeEl?.getAttribute("data-node-id") ?? null

    setContextMenu({ x: e.clientX, y: e.clientY, worldX, worldY, nodeId })
  }, [viewport])

  // ─── WHEEL ──────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
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
      setViewport({
        offsetX: viewport.offsetX - e.deltaX,
        offsetY: viewport.offsetY - e.deltaY,
      })
    }
  }, [viewport, setViewport])

  // ─── TOUCH ──────────────────────────
  const touchRef = useRef<{ lastDist: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handlePanStart(e.touches[0].clientX, e.touches[0].clientY)
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current = { lastDist: Math.sqrt(dx * dx + dy * dy) }
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

  // ─── DOUBLE CLICK ───────────────────
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const worldX = (e.clientX - rect.left - viewport.offsetX) / viewport.scale
    const worldY = (e.clientY - rect.top - viewport.offsetY) / viewport.scale
    onNewNote({ x: worldX, y: worldY })
  }, [viewport, onNewNote])

  // ─── NODE CALLBACKS ─────────────────
  const handleNodeDoubleClick = useCallback((node: CanvasNode) => {
    if (node.node_type === "note" && node.note_id) {
      onEditNote(node.note_id)
    } else if (node.node_type === "text") {
      setEditingNode(node.id)
    }
  }, [onEditNote, setEditingNode])

  const handleNodeSelect = useCallback((id: string, additive: boolean) => {
    selectNode(id, additive)
    setSelectedEdge(null)
    setContextMenu(null)
  }, [selectNode, setSelectedEdge])

  const handleContentChange = useCallback((id: string, content: string) => {
    updateNodeContent(id, content)
  }, [updateNodeContent])

  // ─── CONTEXT MENU ACTIONS ───────────
  const handleContextNewText = useCallback((pos: { x: number; y: number }) => {
    addTextNode("", pos)
  }, [addTextNode])

  const handleContextNewGroup = useCallback((pos: { x: number; y: number }) => {
    addGroupNode("Nuevo grupo", pos, { width: 400, height: 300 })
  }, [addGroupNode])

  const handleContextDelete = useCallback((nodeId: string) => {
    removeNode(nodeId)
  }, [removeNode])

  const handleContextToggleLock = useCallback((nodeId: string) => {
    toggleNodeLocked(nodeId)
  }, [toggleNodeLocked])

  const handleContextEdit = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId)
    if (!node) return
    if (node.node_type === "note" && node.note_id) {
      onEditNote(node.note_id)
    } else if (node.node_type === "text") {
      setEditingNode(nodeId)
    }
  }, [nodeMap, onEditNote, setEditingNode])

  // ─── FIT ALL ────────────────────────
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
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.5)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setViewport({
      scale: newScale,
      offsetX: rect.width / 2 - centerX * newScale,
      offsetY: rect.height / 2 - centerY * newScale,
    })
  }, [nodes, setViewport])

  // ─── NEW NOTE ───────────────────────
  const handleNewNote = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const worldX = (rect.width / 2 - viewport.offsetX) / viewport.scale
    const worldY = (rect.height / 2 - viewport.offsetY) / viewport.scale
    onNewNote({ x: worldX, y: worldY })
  }, [viewport, onNewNote])

  // ─── KEYBOARD ───────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeIds.size > 0) {
        e.preventDefault()
        removeSelectedNodes()
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEdgeId) {
        e.preventDefault()
        removeEdge(selectedEdgeId)
        setSelectedEdge(null)
      }
      if (e.key === "Escape") {
        deselectAll()
        setConnectingFrom(null)
        setConnectingLine(null)
        setContextMenu(null)
        setEditingNode(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "=") {
        e.preventDefault()
        setViewport({ scale: Math.min(viewport.scale * 1.2, 3) })
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault()
        setViewport({ scale: Math.max(viewport.scale / 1.2, 0.1) })
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "0") {
        e.preventDefault()
        fitAllNodes()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault()
        const all = new Set(nodes.map((n) => n.id))
        useNotesStore.setState({ selectedNodeIds: all })
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedNodeIds, selectedEdgeId, viewport.scale, nodes,
      removeSelectedNodes, removeEdge, setSelectedEdge, deselectAll,
      setConnectingFrom, setEditingNode, setViewport, fitAllNodes])

  // ─── Cursor ─────────────────────────
  const cursor = isResizing ? "nwse-resize"
    : isDraggingNode ? "grabbing"
    : isPanning ? "grabbing"
    : connectingFromNodeId ? "crosshair"
    : isRubberBanding ? "crosshair"
    : "grab"

  // ─── Rubber band rect ──────────────
  const rubberBandRect = rubberBand ? {
    x: Math.min(rubberBand.startX, rubberBand.currentX) * viewport.scale + viewport.offsetX,
    y: Math.min(rubberBand.startY, rubberBand.currentY) * viewport.scale + viewport.offsetY,
    w: Math.abs(rubberBand.currentX - rubberBand.startX) * viewport.scale,
    h: Math.abs(rubberBand.currentY - rubberBand.startY) * viewport.scale,
  } : null

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl border border-border overflow-hidden"
      style={{ height: "calc(100vh - 200px)", cursor, touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <pattern
            id="grid"
            width={20 * viewport.scale}
            height={20 * viewport.scale}
            x={viewport.offsetX % (20 * viewport.scale)}
            y={viewport.offsetY % (20 * viewport.scale)}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={1} cy={1} r={0.5} fill="rgba(0,0,0,0.06)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="var(--bg-cream)" />
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Snap guides */}
      {snapGuides.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          {snapGuides.map((g, i) =>
            g.orientation === "vertical" ? (
              <line
                key={i}
                x1={g.position * viewport.scale + viewport.offsetX}
                y1={0}
                x2={g.position * viewport.scale + viewport.offsetX}
                y2="100%"
                stroke="#6B8CC4"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.6}
              />
            ) : (
              <line
                key={i}
                x1={0}
                y1={g.position * viewport.scale + viewport.offsetY}
                x2="100%"
                y2={g.position * viewport.scale + viewport.offsetY}
                stroke="#6B8CC4"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.6}
              />
            )
          )}
        </svg>
      )}

      {/* Edges SVG layer */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: "none" }}>
        <g style={{ pointerEvents: "auto" }}>
          {edges.map((edge) => (
            <CanvasEdgeComponent
              key={edge.id}
              edge={edge}
              nodes={nodeMap}
              scale={viewport.scale}
              offsetX={viewport.offsetX}
              offsetY={viewport.offsetY}
              isSelected={selectedEdgeId === edge.id}
              onSelect={(id) => { setSelectedEdge(id) }}
              onDelete={removeEdge}
            />
          ))}
        </g>
        {/* Connecting line (Bezier preview) */}
        {connectingLine && (
          <path
            d={`M ${connectingLine.fromX} ${connectingLine.fromY} C ${connectingLine.fromX + 60} ${connectingLine.fromY} ${connectingLine.toX - 60} ${connectingLine.toY} ${connectingLine.toX} ${connectingLine.toY}`}
            stroke="#7a9b76"
            strokeWidth={2}
            fill="none"
            strokeDasharray="6 3"
            opacity={0.7}
          />
        )}
      </svg>

      {/* Rubber band selection */}
      {rubberBandRect && (
        <div
          className="absolute border border-blue-500/50 bg-blue-400/10 rounded-sm pointer-events-none"
          style={{
            zIndex: 10,
            left: rubberBandRect.x,
            top: rubberBandRect.y,
            width: rubberBandRect.w,
            height: rubberBandRect.h,
          }}
        />
      )}

      {/* Nodes HTML layer */}
      <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: "none" }}>
        {nodes.map((node) => (
          <div key={node.id} data-node-id={node.id} style={{ pointerEvents: "auto" }}>
            <CanvasNodeComponent
              node={node}
              viewport={viewport}
              isSelected={selectedNodeIds.has(node.id)}
              isEditing={editingNodeId === node.id}
              onSelect={handleNodeSelect}
              onDragStart={handleNodeDragStart}
              onDoubleClick={handleNodeDoubleClick}
              onConnectionStart={handleConnectionStart}
              onResizeStart={handleResizeStart}
              onContentChange={handleContentChange}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 3, pointerEvents: "none" }}>
          <div className="rounded-xl bg-card/80 backdrop-blur-sm border border-border px-8 py-6 text-center max-w-xs">
            <p className="text-sm text-text-secondary mb-1 font-medium">Canvas vacío</p>
            <p className="text-xs text-text-tertiary">
              Doble click para crear una nota, o Shift+arrastrar para seleccionar
            </p>
          </div>
        </div>
      )}

      {/* Minimap */}
      {nodes.length > 0 && containerSize.w > 0 && (
        <CanvasMinimap
          nodes={nodes}
          viewport={viewport}
          containerWidth={containerSize.w}
          containerHeight={containerSize.h}
          onViewportChange={setViewport}
        />
      )}

      {/* Toolbar */}
      <CanvasToolbar
        onNewNote={handleNewNote}
        onFitAll={fitAllNodes}
        snapEnabled={snapEnabled}
        onToggleSnap={toggleSnap}
      />

      {/* Selection count indicator */}
      {selectedNodeIds.size > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-card/90 backdrop-blur-sm border border-border px-3 py-1.5 text-xs text-text-secondary shadow-sm">
          {selectedNodeIds.size} nodos seleccionados
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          worldX={contextMenu.worldX}
          worldY={contextMenu.worldY}
          targetNodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
          onNewNote={onNewNote}
          onNewTextNode={handleContextNewText}
          onNewGroup={handleContextNewGroup}
          onDeleteNode={handleContextDelete}
          onToggleLock={handleContextToggleLock}
          onEditNote={handleContextEdit}
          isNodeLocked={contextMenu.nodeId ? (nodeMap.get(contextMenu.nodeId)?.locked ?? false) : false}
        />
      )}
    </div>
  )
}

function getScreenAnchor(node: CanvasNode, side: string, viewport: CanvasViewport) {
  const x = node.pos_x * viewport.scale + viewport.offsetX
  const y = node.pos_y * viewport.scale + viewport.offsetY
  const w = node.width * viewport.scale
  const h = node.height * viewport.scale
  switch (side) {
    case "top": return { x: x + w / 2, y }
    case "bottom": return { x: x + w / 2, y: y + h }
    case "left": return { x, y: y + h / 2 }
    case "right": return { x: x + w, y: y + h / 2 }
    default: return { x: x + w, y: y + h / 2 }
  }
}
