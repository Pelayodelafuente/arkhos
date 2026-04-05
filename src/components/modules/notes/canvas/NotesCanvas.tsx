"use client"

import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { useNotesStore, useCanvasSearchResults } from "@/stores/notes-store"
import { useUIStore } from "@/stores/ui-store"
import { CanvasNodeComponent } from "./CanvasNode"
import { CanvasEdgeComponent } from "./CanvasEdge"
import { CanvasToolbar } from "./CanvasToolbar"
import { CanvasMinimap } from "./CanvasMinimap"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { CanvasFilterPanel } from "./CanvasFilterPanel"
import { NodePropertiesPanel } from "./NodePropertiesPanel"
import { uploadCanvasImage } from "@/lib/supabase/notes"
import { Search, X } from "lucide-react"
import type { CanvasNode, CanvasViewport, SnapGuide, EdgeSide } from "@/types/notes"
import { CANVAS_BOUNDS } from "@/types/notes"

const VIEWPORT_STORAGE_PREFIX = "arkhos:canvas:"
const SNAP_THRESHOLD = 8
const MIN_NODE_W = 150
const MIN_NODE_H = 80
const ZOOM_MIN = 0.15
const ZOOM_MAX = 4

function isNodeVisible(
  node: CanvasNode,
  viewport: CanvasViewport,
  containerW: number,
  containerH: number,
  margin: number = 100
): boolean {
  const screenX = node.pos_x * viewport.scale + viewport.offsetX
  const screenY = node.pos_y * viewport.scale + viewport.offsetY
  const screenW = node.width * viewport.scale
  const screenH = node.height * viewport.scale
  return (
    screenX + screenW > -margin &&
    screenX < containerW + margin &&
    screenY + screenH > -margin &&
    screenY < containerH + margin
  )
}

function calculateClosestSide(nodeRect: DOMRect, clientX: number, clientY: number): EdgeSide {
  const distances: Record<EdgeSide, number> = {
    top: Math.abs(clientY - nodeRect.top),
    bottom: Math.abs(clientY - nodeRect.bottom),
    left: Math.abs(clientX - nodeRect.left),
    right: Math.abs(clientX - nodeRect.right),
  }
  let closest: EdgeSide = "right"
  let minDist = Infinity
  for (const [side, dist] of Object.entries(distances) as [EdgeSide, number][]) {
    if (dist < minDist) {
      minDist = dist
      closest = side
    }
  }
  return closest
}

function calculateBezierPreview(
  fromX: number, fromY: number,
  toX: number, toY: number,
  fromSide: string
): string {
  const dist = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY)) * 0.4
  const minDist = 40
  const cp = Math.max(dist, minDist)

  let cp1x = fromX, cp1y = fromY
  switch (fromSide) {
    case "right": cp1x += cp; break
    case "left": cp1x -= cp; break
    case "bottom": cp1y += cp; break
    case "top": cp1y -= cp; break
  }

  const dx = toX - fromX
  const dy = toY - fromY
  let cp2x = toX, cp2y = toY
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) cp2x -= cp
    else cp2x += cp
  } else {
    if (dy > 0) cp2y -= cp
    else cp2y += cp
  }

  return `M ${fromX} ${fromY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${toX} ${toY}`
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
  const editEdge = useNotesStore((s) => s.editEdge)
  const addEdge = useNotesStore((s) => s.addEdge)
  const addTextNode = useNotesStore((s) => s.addTextNode)
  const addUrlNode = useNotesStore((s) => s.addUrlNode)
  const addGroupNode = useNotesStore((s) => s.addGroupNode)
  const addImageNode = useNotesStore((s) => s.addImageNode)
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
  const pushHistory = useNotesStore((s) => s.pushHistory)
  const undo = useNotesStore((s) => s.undo)
  const redo = useNotesStore((s) => s.redo)
  const copySelectedNodes = useNotesStore((s) => s.copySelectedNodes)
  const pasteNodes = useNotesStore((s) => s.pasteNodes)
  const duplicateSelectedNodes = useNotesStore((s) => s.duplicateSelectedNodes)
  const history = useNotesStore((s) => s.history)
  const historyIndex = useNotesStore((s) => s.historyIndex)
  const clipboard = useNotesStore((s) => s.clipboard)
  const canvasSearchQuery = useNotesStore((s) => s.canvasSearchQuery)
  const setCanvasSearch = useNotesStore((s) => s.setCanvasSearch)
  const autoLayoutNodes = useNotesStore((s) => s.autoLayoutNodes)
  const groupSelectedNodes = useNotesStore((s) => s.groupSelectedNodes)
  const canvasFilters = useNotesStore((s) => s.canvasFilters)
  const toggleGroupCollapsed = useNotesStore((s) => s.toggleGroupCollapsed)
  const generateBacklinkEdges = useNotesStore((s) => s.generateBacklinkEdges)
  const noteBacklinks = useNotesStore((s) => s.noteBacklinks)
  const removeGroupKeepNodes = useNotesStore((s) => s.removeGroupKeepNodes)
  const removeGroupWithContent = useNotesStore((s) => s.removeGroupWithContent)
  const assignNodeToGroup = useNotesStore((s) => s.assignNodeToGroup)
  const moveGroupWithChildren = useNotesStore((s) => s.moveGroupWithChildren)
  const persistGroupAndChildren = useNotesStore((s) => s.persistGroupAndChildren)
  const updateNodeLabel = useNotesStore((s) => s.updateNodeLabel)
  const selectNodesInGroup = useNotesStore((s) => s.selectNodesInGroup)
  const lockGroupChildren = useNotesStore((s) => s.lockGroupChildren)
  const updateNodeColor = useNotesStore((s) => s.updateNodeColor)

  const { matchingIds: searchMatchingIds } = useCanvasSearchResults()

  const containerRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panStartRef = useRef({ x: 0, y: 0 })
  const [isRubberBanding, setIsRubberBanding] = useState(false)
  const [connectingLine, setConnectingLine] = useState<{
    fromX: number; fromY: number; toX: number; toY: number
  } | null>(null)
  const connectingSideRef = useRef<EdgeSide>("right")
  const [connectionTargetId, setConnectionTargetId] = useState<string | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; worldX: number; worldY: number
    nodeId: string | null
    edgeId?: string | null
    edgeStyle?: import("@/types/notes").EdgeStyle
    isGroupCollapsed?: boolean
    groupColor?: import("@/types/notes").NoteColor
    groupLabel?: string
    nodeGroupId?: string | null
    isGroupChildrenLocked?: boolean
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
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingImagePosRef = useRef<{ x: number; y: number } | null>(null)
  const lastInteractionTimestamp = useRef(0)
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchMatchIndexRef = useRef(0)

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // hasSyncableBacklinks: there are canvas notes with backlinks already loaded
  const hasSyncableBacklinks = useMemo(() => {
    const noteIds = new Set(nodes.filter(n => n.note_id).map(n => n.note_id!))
    return Object.keys(noteBacklinks).some(k => noteIds.has(k) && noteBacklinks[k].length > 0)
  }, [nodes, noteBacklinks])

  const exportPng = useCallback(async () => {
    if (!containerRef.current || isExporting) return
    setIsExporting(true)
    try {
      const hideEls = containerRef.current.querySelectorAll('[data-export-hide]')
      hideEls.forEach(el => ((el as HTMLElement).style.visibility = 'hidden'))

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#FAF7F2',
        useCORS: true,
        scale: 2,
        logging: false,
      })

      hideEls.forEach(el => ((el as HTMLElement).style.visibility = ''))

      const link = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      link.download = `notas-canvas-${date}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      containerRef.current?.querySelectorAll('[data-export-hide]')
        .forEach(el => ((el as HTMLElement).style.visibility = ''))
    } finally {
      setIsExporting(false)
    }
  }, [isExporting])

  // Collapsed group IDs
  const collapsedGroupIds = useMemo(() => {
    const ids = new Set<string>()
    for (const n of nodes) {
      if (n.node_type === 'group' && n.collapsed) ids.add(n.id)
    }
    return ids
  }, [nodes])

  // Nodes hidden because they are inside a collapsed group
  const hiddenByCollapse = useMemo(() => {
    if (collapsedGroupIds.size === 0) return new Set<string>()
    const hidden = new Set<string>()
    for (const n of nodes) {
      if (n.node_type !== 'group') {
        // Check group_id
        if (n.group_id && collapsedGroupIds.has(n.group_id)) {
          hidden.add(n.id)
          continue
        }
        // Check spatial containment
        for (const gid of collapsedGroupIds) {
          const group = nodeMap.get(gid)
          if (!group) continue
          const cx = n.pos_x + n.width / 2
          const cy = n.pos_y + n.height / 2
          if (cx >= group.pos_x && cx <= group.pos_x + group.width &&
              cy >= group.pos_y && cy <= group.pos_y + group.height) {
            hidden.add(n.id)
          }
        }
      }
    }
    return hidden
  }, [nodes, nodeMap, collapsedGroupIds])

  // Filter dimmed IDs
  const filterDimmedIds = useMemo(() => {
    const { types, colors } = canvasFilters
    if (types.length === 0 && colors.length === 0) return new Set<string>()
    return new Set(
      nodes
        .filter(n => {
          const typeMatch = types.length === 0 || types.includes(n.node_type)
          const colorMatch = colors.length === 0 || colors.includes(n.color)
          return !(typeMatch && colorMatch)
        })
        .map(n => n.id)
    )
  }, [nodes, canvasFilters])

  const visibleNodes = useMemo(
    () => nodes.filter((n) =>
      isNodeVisible(n, viewport, containerSize.w, containerSize.h) &&
      !hiddenByCollapse.has(n.id)
    ),
    [nodes, viewport, containerSize.w, containerSize.h, hiddenByCollapse]
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize(prev =>
        prev.w === Math.round(width) && prev.h === Math.round(height)
          ? prev
          : { w: Math.round(width), h: Math.round(height) }
      )
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  useEffect(() => {
    if (!canvas) return
    const key = `${VIEWPORT_STORAGE_PREFIX}${canvas.id}:viewport`
    const t = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(viewport))
    }, 300)
    return () => clearTimeout(t)
  }, [viewport, canvas])

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

  useEffect(() => {
    if (hasAutoFitted.current || nodes.length === 0 || containerSize.w === 0) return
    hasAutoFitted.current = true
    requestAnimationFrame(() => fitAllNodes())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, containerSize.w])

  // Wheel: always zoom, native event with passive:false
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      lastInteractionTimestamp.current = Date.now()

      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const vp = viewportRef.current

      if (e.shiftKey) {
        setViewport({ ...vp, offsetX: vp.offsetX - e.deltaY })
        return
      }

      const isTrackpadPinch = e.ctrlKey && Math.abs(e.deltaY) < 10
      const zoomSensitivity = isTrackpadPinch ? 0.01 : 0.001
      const delta = -e.deltaY * zoomSensitivity
      const { scale, offsetX, offsetY } = vp
      const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale + delta * scale))
      const worldX = (mouseX - offsetX) / scale
      const worldY = (mouseY - offsetY) / scale
      const newOffsetX = mouseX - worldX * newScale
      const newOffsetY = mouseY - worldY * newScale
      setViewport({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY })
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setViewport])

  const calculateSnapGuides = useCallback((
    movingId: string, x: number, y: number, w: number, h: number
  ): { guides: SnapGuide[]; snappedX: number; snappedY: number } => {
    if (!snapEnabled) return { guides: [], snappedX: x, snappedY: y }
    const guides: SnapGuide[] = []
    let snappedX = x, snappedY = y
    const movingCenterX = x + w / 2, movingCenterY = y + h / 2
    const movingRight = x + w, movingBottom = y + h

    for (const other of nodes) {
      if (other.id === movingId || selectedNodeIds.has(other.id)) continue
      const oCX = other.pos_x + other.width / 2, oCY = other.pos_y + other.height / 2
      const oR = other.pos_x + other.width, oB = other.pos_y + other.height

      for (const { a, b } of [
        { a: x, b: other.pos_x }, { a: movingCenterX, b: oCX }, { a: movingRight, b: oR },
        { a: x, b: oR }, { a: movingRight, b: other.pos_x },
      ]) {
        if (Math.abs(a - b) < SNAP_THRESHOLD) {
          snappedX = x + (b - a)
          guides.push({ orientation: "vertical", position: b })
          break
        }
      }
      for (const { a, b } of [
        { a: y, b: other.pos_y }, { a: movingCenterY, b: oCY }, { a: movingBottom, b: oB },
        { a: y, b: oB }, { a: movingBottom, b: other.pos_y },
      ]) {
        if (Math.abs(a - b) < SNAP_THRESHOLD) {
          snappedY = y + (b - a)
          guides.push({ orientation: "horizontal", position: b })
          break
        }
      }
    }
    return { guides, snappedX, snappedY }
  }, [nodes, snapEnabled, selectedNodeIds])

  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true)
    panStartRef.current = { x: clientX - viewport.offsetX, y: clientY - viewport.offsetY }
  }, [viewport.offsetX, viewport.offsetY])

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return
    setViewport({
      offsetX: clientX - panStartRef.current.x,
      offsetY: clientY - panStartRef.current.y,
    })
  }, [isPanning, setViewport])

  const handlePanEnd = useCallback(() => { setIsPanning(false) }, [])

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
      if (snapEnabled && dragNodeId) {
        const anchorNode = nodeMap.get(dragNodeId)
        if (anchorNode) {
          const { guides, snappedX, snappedY } = calculateSnapGuides(
            dragNodeId, anchorNode.pos_x, anchorNode.pos_y, anchorNode.width, anchorNode.height
          )
          const snapDx = snappedX - anchorNode.pos_x, snapDy = snappedY - anchorNode.pos_y
          if (snapDx !== 0 || snapDy !== 0) moveSelectedNodes(snapDx, snapDy)
          setSnapGuides(guides)
        }
      } else { setSnapGuides([]) }
      return
    }
    const node = nodeMap.get(dragNodeId)
    if (!node) return
    let newX = (clientX - dragOffset.x - viewport.offsetX) / viewport.scale
    let newY = (clientY - dragOffset.y - viewport.offsetY) / viewport.scale
    if (snapEnabled) {
      const { guides, snappedX, snappedY } = calculateSnapGuides(dragNodeId, newX, newY, node.width, node.height)
      newX = snappedX; newY = snappedY; setSnapGuides(guides)
    }
    if (node.node_type === 'group') {
      // Move group AND all contained children together
      moveGroupWithChildren(dragNodeId, newX, newY)
      setDragOverGroupId(null)
    } else {
      updateNodePos(dragNodeId, { x: newX, y: newY })
      // Visual feedback: highlight the group the dragged node is hovering over
      const cx = newX + node.width / 2
      const cy = newY + node.height / 2
      const hoverGroup = nodes.find((n) =>
        n.node_type === 'group' && n.id !== dragNodeId &&
        cx >= n.pos_x && cx <= n.pos_x + n.width &&
        cy >= n.pos_y && cy <= n.pos_y + n.height
      )
      setDragOverGroupId(hoverGroup?.id ?? null)
    }
  }, [isDraggingNode, dragNodeId, isMultiDrag, dragOffset, viewport, nodeMap, nodes, snapEnabled, calculateSnapGuides, updateNodePos, moveGroupWithChildren, moveSelectedNodes, setSnapGuides])

  const handleNodeDragEnd = useCallback(() => {
    if (dragNodeId) {
      pushHistory()
      const node = nodeMap.get(dragNodeId)
      if (isMultiDrag) {
        persistSelectedNodePositions()
      } else if (node) {
        if (node.node_type === 'group') {
          // Persist group and all its children
          persistGroupAndChildren(dragNodeId)
        } else {
          persistNodePos(dragNodeId, { x: node.pos_x, y: node.pos_y })
        }
        // Assign group_id when a non-group node is dropped inside a group
        if (node.node_type !== 'group') {
          const cx = node.pos_x + node.width / 2
          const cy = node.pos_y + node.height / 2
          const containerGroup = nodes.find((n) =>
            n.node_type === 'group' &&
            n.id !== dragNodeId &&
            cx >= n.pos_x && cx <= n.pos_x + n.width &&
            cy >= n.pos_y && cy <= n.pos_y + n.height
          )
          const newGroupId = containerGroup?.id ?? null
          if (newGroupId !== node.group_id) {
            assignNodeToGroup(dragNodeId, newGroupId)
          }
        }
      }
    }
    setIsDraggingNode(false); setDragNodeId(null); setIsMultiDrag(false); setSnapGuides([]); setDragOverGroupId(null)
  }, [dragNodeId, isMultiDrag, nodeMap, nodes, persistNodePos, persistGroupAndChildren, persistSelectedNodePositions, setSnapGuides, pushHistory, assignNodeToGroup])

  const handleResizeStart = useCallback((nodeId: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const node = nodeMap.get(nodeId)
    if (!node || node.locked) return
    setIsResizing(true)
    resizeRef.current = { nodeId, handle, startX: e.clientX, startY: e.clientY, origX: node.pos_x, origY: node.pos_y, origW: node.width, origH: node.height }
  }, [nodeMap])

  const handleResizeMove = useCallback((clientX: number, clientY: number) => {
    if (!isResizing || !resizeRef.current) return
    const { nodeId, handle, startX, startY, origX, origY, origW, origH } = resizeRef.current
    const dx = (clientX - startX) / viewport.scale, dy = (clientY - startY) / viewport.scale
    let newX = origX, newY = origY, newW = origW, newH = origH
    if (handle.includes("e")) newW = Math.max(MIN_NODE_W, origW + dx)
    if (handle.includes("w")) { newW = Math.max(MIN_NODE_W, origW - dx); newX = origX + origW - newW }
    if (handle.includes("s")) newH = Math.max(MIN_NODE_H, origH + dy)
    if (handle.includes("n")) { newH = Math.max(MIN_NODE_H, origH - dy); newY = origY + origH - newH }
    updateNodePos(nodeId, { x: newX, y: newY })
    updateNodeSize(nodeId, { width: newW, height: newH })
  }, [isResizing, viewport.scale, updateNodePos, updateNodeSize])

  const handleResizeEnd = useCallback(() => {
    if (resizeRef.current) pushHistory()
    setIsResizing(false); resizeRef.current = null
  }, [pushHistory])

  const handleConnectionStart = useCallback((nodeId: string, side: string) => {
    setConnectingFrom(nodeId)
    connectingSideRef.current = side as EdgeSide
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
    const target = document.elementFromPoint(clientX, clientY)
    const nodeEl = target?.closest("[data-node-id]")
    const hoveredId = nodeEl?.getAttribute("data-node-id") ?? null
    setConnectionTargetId(hoveredId && hoveredId !== connectingFromNodeId ? hoveredId : null)
  }, [connectingFromNodeId, connectingLine])

  const handleConnectionEnd = useCallback((clientX: number, clientY: number) => {
    if (connectingFromNodeId) {
      const target = document.elementFromPoint(clientX, clientY)
      const nodeEl = target?.closest("[data-node-id]")
      const targetId = nodeEl?.getAttribute("data-node-id")
      if (targetId && targetId !== connectingFromNodeId) {
        const targetDomEl = nodeEl as HTMLElement
        const targetRect = targetDomEl.getBoundingClientRect()
        const toSide = calculateClosestSide(targetRect, clientX, clientY)
        addEdge(connectingFromNodeId, targetId, connectingSideRef.current, toSide)
      }
    }
    setConnectingFrom(null); setConnectingLine(null); setConnectionTargetId(null)
  }, [connectingFromNodeId, addEdge, setConnectingFrom])

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
    const x = Math.min(rubberBand.startX, wx), y = Math.min(rubberBand.startY, wy)
    selectNodesInRect({ x, y, width: Math.abs(wx - rubberBand.startX), height: Math.abs(wy - rubberBand.startY) })
  }, [isRubberBanding, rubberBand, viewport, setRubberBand, selectNodesInRect])

  const handleRubberBandEnd = useCallback(() => {
    setIsRubberBanding(false); setRubberBand(null)
  }, [setRubberBand])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) return
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      panStartRef.current = { x: e.clientX - viewport.offsetX, y: e.clientY - viewport.offsetY }
      return
    }
    if (e.button !== 0) return
    setContextMenu(null); deselectAll(); setEditingNode(null)
    if (e.shiftKey) { handleRubberBandStart(e.clientX, e.clientY) }
    else { handlePanStart(e.clientX, e.clientY) }
  }, [viewport.offsetX, viewport.offsetY, handlePanStart, handleRubberBandStart, deselectAll, setEditingNode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isResizing) handleResizeMove(e.clientX, e.clientY)
    else if (isDraggingNode) handleNodeDragMove(e.clientX, e.clientY)
    else if (connectingFromNodeId) handleConnectionMove(e.clientX, e.clientY)
    else if (isRubberBanding) handleRubberBandMove(e.clientX, e.clientY)
    else if (isPanning) handlePanMove(e.clientX, e.clientY)
  }, [isResizing, isDraggingNode, connectingFromNodeId, isRubberBanding, isPanning,
      handleResizeMove, handleNodeDragMove, handleConnectionMove, handleRubberBandMove, handlePanMove])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isResizing) handleResizeEnd()
    else if (isDraggingNode) handleNodeDragEnd()
    else if (connectingFromNodeId) handleConnectionEnd(e.clientX, e.clientY)
    else if (isRubberBanding) handleRubberBandEnd()
    else handlePanEnd()
    lastInteractionTimestamp.current = Date.now()
  }, [isResizing, isDraggingNode, connectingFromNodeId, isRubberBanding,
      handleResizeEnd, handleNodeDragEnd, handleConnectionEnd, handleRubberBandEnd, handlePanEnd])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const worldX = (e.clientX - rect.left - viewport.offsetX) / viewport.scale
    const worldY = (e.clientY - rect.top - viewport.offsetY) / viewport.scale
    const target = document.elementFromPoint(e.clientX, e.clientY)
    const nodeEl = target?.closest("[data-node-id]")
    const nodeId = nodeEl?.getAttribute("data-node-id") ?? null
    const node = nodeId ? nodeMap.get(nodeId) : null
    const isGroup = node?.node_type === 'group'
    const groupChildren = isGroup && node ? nodes.filter(n => n.group_id === node.id) : []
    setContextMenu({
      x: e.clientX, y: e.clientY, worldX, worldY, nodeId,
      isGroupCollapsed: isGroup ? (node!.collapsed ?? false) : undefined,
      groupColor: isGroup ? ((node!.color ?? 'default') as import("@/types/notes").NoteColor) : undefined,
      groupLabel: isGroup ? (node!.label ?? '') : undefined,
      nodeGroupId: node && !isGroup ? (node.group_id ?? null) : null,
      isGroupChildrenLocked: isGroup ? groupChildren.length > 0 && groupChildren.every(n => n.locked) : undefined,
    })
  }, [viewport, nodeMap])

  const touchRef = useRef<{ lastDist: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) handlePanStart(e.touches[0].clientX, e.touches[0].clientY)
    else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current = { lastDist: Math.sqrt(dx * dx + dy * dy) }
    }
  }, [handlePanStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && !isDraggingNode) handlePanMove(e.touches[0].clientX, e.touches[0].clientY)
    else if (isDraggingNode && e.touches.length === 1) handleNodeDragMove(e.touches[0].clientX, e.touches[0].clientY)
    else if (e.touches.length === 2 && touchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / touchRef.current.lastDist
      const newScale = Math.min(Math.max(viewport.scale * ratio, ZOOM_MIN), ZOOM_MAX)
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
        const scaleRatio = newScale / viewport.scale
        setViewport({ scale: newScale, offsetX: cx - (cx - viewport.offsetX) * scaleRatio, offsetY: cy - (cy - viewport.offsetY) * scaleRatio })
      }
      touchRef.current.lastDist = dist
    }
  }, [isDraggingNode, viewport, handlePanMove, handleNodeDragMove, setViewport])

  const handleTouchEnd = useCallback(() => {
    if (isDraggingNode) handleNodeDragEnd()
    else handlePanEnd()
    touchRef.current = null
  }, [isDraggingNode, handleNodeDragEnd, handlePanEnd])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node-id]")) return
    if ((e.target as HTMLElement).closest("[data-edge-id]")) return
    if (Date.now() - lastInteractionTimestamp.current < 300) return
    const targetEl = e.target as HTMLElement
    const isBackground = targetEl === containerRef.current ||
      targetEl.tagName === "svg" || targetEl.tagName === "rect" ||
      targetEl.tagName === "pattern" || targetEl.tagName === "circle" ||
      targetEl.closest("svg")?.classList.contains("canvas-bg-svg")
    if (!isBackground) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const worldX = (e.clientX - rect.left - viewport.offsetX) / viewport.scale
    const worldY = (e.clientY - rect.top - viewport.offsetY) / viewport.scale
    onNewNote({ x: worldX, y: worldY })
  }, [viewport, onNewNote])

  const handleNodeDoubleClick = useCallback((node: CanvasNode) => {
    if (node.node_type === "note" && node.note_id) onEditNote(node.note_id)
    else if (node.node_type === "text") setEditingNode(node.id)
  }, [onEditNote, setEditingNode])

  const handleNodeSelect = useCallback((id: string, additive: boolean) => {
    selectNode(id, additive); setSelectedEdge(null); setContextMenu(null)
  }, [selectNode, setSelectedEdge])

  const handleContentChange = useCallback((id: string, content: string) => {
    updateNodeContent(id, content)
  }, [updateNodeContent])

  const handleContextNewText = useCallback((pos: { x: number; y: number }) => { addTextNode("", pos) }, [addTextNode])
  const handleContextNewGroup = useCallback((pos: { x: number; y: number }) => { addGroupNode("Nuevo grupo", pos, { width: 400, height: 300 }) }, [addGroupNode])
  const handleContextNewUrl = useCallback((pos: { x: number; y: number }) => {
    const url = prompt("Introduce la URL:")
    if (!url) return
    addUrlNode(url, pos)
  }, [addUrlNode])
  const handleContextDelete = useCallback((nodeId: string) => { removeNode(nodeId) }, [removeNode])
  const handleContextToggleLock = useCallback((nodeId: string) => { toggleNodeLocked(nodeId) }, [toggleNodeLocked])
  const handleContextEdit = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId)
    if (!node) return
    if (node.node_type === "note" && node.note_id) onEditNote(node.note_id)
    else if (node.node_type === "text") setEditingNode(nodeId)
  }, [nodeMap, onEditNote, setEditingNode])

  const fitAllNodes = useCallback(() => {
    if (nodes.length === 0) { setViewport({ offsetX: 0, offsetY: 0, scale: 1 }); return }
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.pos_x); minY = Math.min(minY, n.pos_y)
      maxX = Math.max(maxX, n.pos_x + n.width); maxY = Math.max(maxY, n.pos_y + n.height)
    }
    const padding = 60
    const contentW = maxX - minX + padding * 2, contentH = maxY - minY + padding * 2
    const newScale = Math.min(Math.max(Math.min(rect.width / contentW, rect.height / contentH), 0.2), 1.5)
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2
    const target = { scale: newScale, offsetX: rect.width / 2 - centerX * newScale, offsetY: rect.height / 2 - centerY * newScale }
    // Animate with easeOutCubic over 400ms
    const from = viewportRef.current
    const duration = 400
    const startTime = performance.now()
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const step = (now: number) => {
      const t = ease(Math.min((now - startTime) / duration, 1))
      setViewport({
        scale: from.scale + (target.scale - from.scale) * t,
        offsetX: from.offsetX + (target.offsetX - from.offsetX) * t,
        offsetY: from.offsetY + (target.offsetY - from.offsetY) * t,
      })
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [nodes, setViewport])

  const centerOnNode = useCallback((nodeId: string) => {
    const node = nodeMap.get(nodeId)
    if (!node) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setViewport({
      offsetX: rect.width / 2 - (node.pos_x + node.width / 2) * viewport.scale,
      offsetY: rect.height / 2 - (node.pos_y + node.height / 2) * viewport.scale,
    })
  }, [nodeMap, viewport.scale, setViewport])

  const handleNewNote = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    onNewNote({ x: (rect.width / 2 - viewport.offsetX) / viewport.scale, y: (rect.height / 2 - viewport.offsetY) / viewport.scale })
  }, [viewport, onNewNote])

  const handleAddTextNode = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    addTextNode("", { x: (rect.width / 2 - viewport.offsetX) / viewport.scale, y: (rect.height / 2 - viewport.offsetY) / viewport.scale })
  }, [viewport, addTextNode])

  const handleAddGroupNode = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    addGroupNode("Nuevo grupo", { x: (rect.width / 2 - viewport.offsetX) / viewport.scale, y: (rect.height / 2 - viewport.offsetY) / viewport.scale }, { width: 400, height: 300 })
  }, [viewport, addGroupNode])

  const handleAddUrlNode = useCallback(() => {
    const url = prompt("Introduce la URL:")
    if (!url) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    addUrlNode(url, { x: (rect.width / 2 - viewport.offsetX) / viewport.scale, y: (rect.height / 2 - viewport.offsetY) / viewport.scale })
  }, [viewport, addUrlNode])

  const handleAutoLayout = useCallback(() => {
    autoLayoutNodes()
    requestAnimationFrame(() => fitAllNodes())
  }, [autoLayoutNodes, fitAllNodes])

  const handleGroupSelected = useCallback(() => { groupSelectedNodes() }, [groupSelectedNodes])

  const handleImageFileSelected = useCallback(async (file: File, pos: { x: number; y: number }) => {
    if (!canvas) return
    try {
      const imageUrl = await uploadCanvasImage(userId, canvas.id, file)
      await addImageNode(imageUrl, pos)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al subir imagen"
      useUIStore.getState().addToast(msg, "error")
    }
  }, [canvas, userId, addImageNode])

  const handleAddImageNode = useCallback((pos?: { x: number; y: number }) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    pendingImagePosRef.current = { x: pos?.x ?? (rect.width / 2 - viewport.offsetX) / viewport.scale, y: pos?.y ?? (rect.height / 2 - viewport.offsetY) / viewport.scale }
    fileInputRef.current?.click()
  }, [viewport])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pendingImagePosRef.current) return
    handleImageFileSelected(file, pendingImagePosRef.current)
    pendingImagePosRef.current = null
    e.target.value = ""
  }, [handleImageFileSelected])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setIsDraggingFile(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
    setIsDraggingFile(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingFile(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith("image/")) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    handleImageFileSelected(file, { x: (e.clientX - rect.left - viewport.offsetX) / viewport.scale, y: (e.clientY - rect.top - viewport.offsetY) / viewport.scale })
  }, [viewport, handleImageFileSelected])

  const navigateToSearchMatch = useCallback((direction: 1 | -1) => {
    if (!searchMatchingIds || searchMatchingIds.size === 0) return
    const ids = Array.from(searchMatchingIds)
    searchMatchIndexRef.current = ((searchMatchIndexRef.current + direction) % ids.length + ids.length) % ids.length
    centerOnNode(ids[searchMatchIndexRef.current])
    selectNode(ids[searchMatchIndexRef.current], false)
  }, [searchMatchingIds, centerOnNode, selectNode])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showSearch && e.target === searchInputRef.current) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeIds.size > 0) { e.preventDefault(); removeSelectedNodes() }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEdgeId) { e.preventDefault(); removeEdge(selectedEdgeId); setSelectedEdge(null) }
      if (e.key === "Escape") {
        if (showSearch) { setCanvasSearch(""); setShowSearch(false); return }
        deselectAll(); setConnectingFrom(null); setConnectingLine(null); setContextMenu(null); setEditingNode(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); setShowSearch((p) => !p); if (!showSearch) searchMatchIndexRef.current = 0; else setCanvasSearch("") }
      if ((e.ctrlKey || e.metaKey) && e.key === "=") { e.preventDefault(); setViewport({ scale: Math.min(viewport.scale * 1.2, ZOOM_MAX) }) }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") { e.preventDefault(); setViewport({ scale: Math.max(viewport.scale / 1.2, ZOOM_MIN) }) }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "0") { e.preventDefault(); fitAllNodes() }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") { e.preventDefault(); useNotesStore.setState({ selectedNodeIds: new Set(nodes.map((n) => n.id)) }) }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo() }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedNodeIds.size > 0) { e.preventDefault(); copySelectedNodes() }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); pasteNodes() }
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedNodeIds.size > 0) { e.preventDefault(); duplicateSelectedNodes() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedNodeIds, selectedEdgeId, viewport.scale, nodes, showSearch, removeSelectedNodes, removeEdge, setSelectedEdge, deselectAll, setConnectingFrom, setEditingNode, setViewport, fitAllNodes, undo, redo, copySelectedNodes, pasteNodes, duplicateSelectedNodes, setCanvasSearch])

  const resizeCursor = resizeRef.current?.handle
    ? resizeRef.current.handle === "se" || resizeRef.current.handle === "nw" ? "nwse-resize"
      : resizeRef.current.handle === "sw" || resizeRef.current.handle === "ne" ? "nesw-resize"
      : resizeRef.current.handle === "n" || resizeRef.current.handle === "s" ? "ns-resize"
      : resizeRef.current.handle === "e" || resizeRef.current.handle === "w" ? "ew-resize"
      : "nwse-resize" : "nwse-resize"

  const cursor = isResizing ? resizeCursor : isDraggingNode ? "grabbing" : isPanning ? "grabbing"
    : connectingFromNodeId ? "crosshair" : isRubberBanding ? "crosshair" : "grab"

  const rubberBandRect = rubberBand ? {
    x: Math.min(rubberBand.startX, rubberBand.currentX) * viewport.scale + viewport.offsetX,
    y: Math.min(rubberBand.startY, rubberBand.currentY) * viewport.scale + viewport.offsetY,
    w: Math.abs(rubberBand.currentX - rubberBand.startX) * viewport.scale,
    h: Math.abs(rubberBand.currentY - rubberBand.startY) * viewport.scale,
  } : null

  const isSearchActive = showSearch && searchMatchingIds !== null

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 200px)" }}>
    {/* Node properties panel — outside overflow:hidden canvas */}
    {selectedNodeIds.size === 1 && (() => {
      const selectedId = [...selectedNodeIds][0]
      const selectedNode = nodeMap.get(selectedId)
      return selectedNode ? <NodePropertiesPanel key={selectedId} node={selectedNode} /> : null
    })()}

    <div
      ref={containerRef}
      className="relative w-full h-full rounded-xl border border-border overflow-hidden"
      style={{ cursor, touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />

      {isDraggingFile && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ border: "2px dashed var(--accent-terracotta)", borderRadius: 12, backgroundColor: "rgba(196,112,74,0.06)" }}>
          <div className="rounded-xl bg-card/90 backdrop-blur-sm border border-border px-6 py-4 text-center">
            <p className="text-sm text-text-secondary font-medium">Soltar imagen aqui</p>
          </div>
        </div>
      )}

      <svg className="canvas-bg-svg absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <pattern id="grid" width={20 * viewport.scale} height={20 * viewport.scale}
            x={viewport.offsetX % (20 * viewport.scale)} y={viewport.offsetY % (20 * viewport.scale)} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.5} fill="rgba(0,0,0,0.06)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="var(--bg-cream)" />
        <rect width="100%" height="100%" fill="url(#grid)" />
        <g>
          {(() => {
            const bx = CANVAS_BOUNDS.minX * viewport.scale + viewport.offsetX
            const by = CANVAS_BOUNDS.minY * viewport.scale + viewport.offsetY
            const bw = (CANVAS_BOUNDS.maxX - CANVAS_BOUNDS.minX) * viewport.scale
            const bh = (CANVAS_BOUNDS.maxY - CANVAS_BOUNDS.minY) * viewport.scale
            return (
              <>
                <rect x={0} y={0} width="100%" height={Math.max(0, by)} fill="rgba(0,0,0,0.03)" />
                {by + bh < containerSize.h && <rect x={0} y={by + bh} width="100%" height={containerSize.h - (by + bh)} fill="rgba(0,0,0,0.03)" />}
                <rect x={0} y={Math.max(0, by)} width={Math.max(0, bx)} height={bh} fill="rgba(0,0,0,0.03)" />
                {bx + bw < containerSize.w && <rect x={bx + bw} y={Math.max(0, by)} width={containerSize.w - (bx + bw)} height={bh} fill="rgba(0,0,0,0.03)" />}
                <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke="var(--border-medium)"
                  strokeWidth={1 / viewport.scale} strokeDasharray={`${8 / viewport.scale} ${4 / viewport.scale}`} opacity={0.5} rx={4} />
              </>
            )
          })()}
        </g>
      </svg>

      {snapGuides.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          {snapGuides.map((g, i) => g.orientation === "vertical" ? (
            /* TODO: revisar #6B8CC4 — indicador snap guide funcional */
            <line key={i} x1={g.position * viewport.scale + viewport.offsetX} y1={0}
              x2={g.position * viewport.scale + viewport.offsetX} y2="100%" stroke="#6B8CC4" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
          ) : (
            <line key={i} x1={0} y1={g.position * viewport.scale + viewport.offsetY}
              x2="100%" y2={g.position * viewport.scale + viewport.offsetY} stroke="#6B8CC4" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
          ))}
        </svg>
      )}

      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: "none" }}>
        <g style={{ pointerEvents: "auto" }}>
          {edges.map((edge) => (
            <CanvasEdgeComponent key={edge.id} edge={edge} nodes={nodeMap} scale={viewport.scale}
              offsetX={viewport.offsetX} offsetY={viewport.offsetY} isSelected={selectedEdgeId === edge.id}
              onSelect={(id) => { setSelectedEdge(id) }} onDelete={removeEdge}
              onEditLabel={(id) => {
                const edg = edges.find(ed => ed.id === id)
                const lbl = prompt("Etiqueta de la conexion:", edg?.label || "")
                if (lbl !== null) editEdge(id, { label: lbl })
              }}
              onContextMenu={(id, ev) => {
                ev.preventDefault()
                const edg = edges.find((e) => e.id === id)
                setContextMenu({ x: ev.clientX, y: ev.clientY, worldX: 0, worldY: 0, nodeId: null, edgeId: id, edgeStyle: edg?.style ?? 'arrow' })
              }} />
          ))}
        </g>
        {connectingLine && (
          <>
            <path d={calculateBezierPreview(connectingLine.fromX, connectingLine.fromY, connectingLine.toX, connectingLine.toY, connectingSideRef.current)}
              stroke="#7a9b76" strokeWidth={6} fill="none" opacity={0.15} strokeLinecap="round" />
            <path d={calculateBezierPreview(connectingLine.fromX, connectingLine.fromY, connectingLine.toX, connectingLine.toY, connectingSideRef.current)}
              stroke="#7a9b76" strokeWidth={2 / viewport.scale} fill="none"
              strokeDasharray={`${6 / viewport.scale} ${4 / viewport.scale}`} opacity={0.7} />
            <circle cx={connectingLine.toX} cy={connectingLine.toY} r={4} fill="#7a9b76" opacity={0.85} />
          </>
        )}
      </svg>

      {rubberBandRect && (
        <div className="absolute rounded-sm pointer-events-none"
          style={{ border: "1px solid rgba(196,112,74,0.5)", backgroundColor: "rgba(196,112,74,0.08)", zIndex: 10, left: rubberBandRect.x, top: rubberBandRect.y, width: rubberBandRect.w, height: rubberBandRect.h }} />
      )}

      <div className="absolute inset-0" style={{ zIndex: 2, pointerEvents: "none" }}>
        {visibleNodes.map((node) => {
          const isConnTarget = connectionTargetId === node.id
          const isDimmedBySearch = isSearchActive && !searchMatchingIds!.has(node.id)
          const isDimmed = isDimmedBySearch || filterDimmedIds.has(node.id)
          return (
            <div key={node.id} data-node-id={node.id}
              style={{ pointerEvents: "auto", opacity: isDimmed ? 0.3 : 1, transition: "opacity 200ms ease" }}>
              <CanvasNodeComponent node={node} viewport={viewport} isSelected={selectedNodeIds.has(node.id)}
                isEditing={editingNodeId === node.id} onSelect={handleNodeSelect} onDragStart={handleNodeDragStart}
                onDoubleClick={handleNodeDoubleClick} onConnectionStart={handleConnectionStart}
                onResizeStart={handleResizeStart} onContentChange={handleContentChange}
                onLabelChange={updateNodeLabel}
                isConnectionTarget={isConnTarget} isDragOverGroup={dragOverGroupId === node.id}
                searchDimmed={isDimmed} allNodes={nodes}
                onToggleCollapsed={toggleGroupCollapsed} />
            </div>
          )
        })}
      </div>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 3, pointerEvents: "none" }}>
          <div className="rounded-xl bg-card/80 backdrop-blur-sm border border-border px-8 py-6 text-center max-w-xs">
            <p className="text-sm text-text-secondary mb-1 font-medium">Canvas vacio</p>
            <p className="text-xs text-text-tertiary">Doble click para crear una nota, o Shift+arrastrar para seleccionar</p>
          </div>
        </div>
      )}

      {nodes.length > 0 && containerSize.w > 0 && (
        <div data-export-hide>
          <CanvasMinimap nodes={nodes} viewport={viewport} containerWidth={containerSize.w}
            containerHeight={containerSize.h} onViewportChange={setViewport} />
        </div>
      )}

      <div data-export-hide>
        <CanvasToolbar onNewNote={handleNewNote} onAddTextNode={handleAddTextNode} onAddUrlNode={handleAddUrlNode}
          onAddImageNode={() => handleAddImageNode()} onAddGroupNode={handleAddGroupNode} onFitAll={fitAllNodes}
          snapEnabled={snapEnabled} onToggleSnap={toggleSnap} onUndo={undo} onRedo={redo}
          onDuplicate={duplicateSelectedNodes} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
          hasSelection={selectedNodeIds.size > 0} onAutoLayout={handleAutoLayout} onGroupSelection={handleGroupSelected}
          onToggleSearch={() => setShowSearch(s => !s)} selectionCount={selectedNodeIds.size}
          onToggleFilters={() => setShowFilters(v => !v)}
          activeFilterCount={canvasFilters.types.length + canvasFilters.colors.length}
          onSyncBacklinks={generateBacklinkEdges}
          hasSyncableBacklinks={hasSyncableBacklinks}
          onExportPng={exportPng}
          isExporting={isExporting} />
      </div>
      {showFilters && <CanvasFilterPanel onClose={() => setShowFilters(false)} />}

      {selectedNodeIds.size > 1 && !showSearch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-card/90 backdrop-blur-sm border border-border px-3 py-1.5 text-xs text-text-secondary shadow-sm">
          {selectedNodeIds.size} nodos seleccionados
        </div>
      )}

      {showSearch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl bg-card/95 backdrop-blur-sm border border-border px-3 py-2 shadow-sm">
          <Search size={14} className="text-text-tertiary flex-shrink-0" />
          <input ref={searchInputRef} autoFocus placeholder="Buscar en canvas..."
            className="bg-transparent text-sm text-foreground placeholder:text-text-tertiary outline-none w-48 font-sans"
            value={canvasSearchQuery}
            onChange={(e) => { setCanvasSearch(e.target.value); searchMatchIndexRef.current = 0 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setCanvasSearch(""); setShowSearch(false) }
              if (e.key === "Enter") { e.preventDefault(); navigateToSearchMatch(e.shiftKey ? -1 : 1) }
            }} />
          {searchMatchingIds !== null && (
            <span className="text-xs text-text-tertiary font-mono whitespace-nowrap">{searchMatchingIds.size} resultados</span>
          )}
          <button onClick={() => { setCanvasSearch(""); setShowSearch(false) }}
            className="flex-shrink-0 p-0.5 rounded hover:bg-sand transition-colors">
            <X size={14} className="text-text-tertiary" />
          </button>
        </div>
      )}

      {contextMenu && (
        <CanvasContextMenu x={contextMenu.x} y={contextMenu.y} worldX={contextMenu.worldX} worldY={contextMenu.worldY}
          targetNodeId={contextMenu.nodeId} onClose={() => setContextMenu(null)} onNewNote={onNewNote}
          onNewTextNode={handleContextNewText} onNewUrlNode={handleContextNewUrl}
          onNewImageNode={(pos) => handleAddImageNode(pos)} onNewGroup={handleContextNewGroup}
          onDeleteNode={handleContextDelete} onToggleLock={handleContextToggleLock} onEditNote={handleContextEdit}
          isNodeLocked={contextMenu.nodeId ? (nodeMap.get(contextMenu.nodeId)?.locked ?? false) : false}
          onCopy={copySelectedNodes} onPaste={() => pasteNodes()} onDuplicate={duplicateSelectedNodes}
          hasSelection={selectedNodeIds.size > 0} hasClipboard={clipboard !== null && clipboard.nodes.length > 0}
          targetEdgeId={contextMenu.edgeId ?? null}
          currentEdgeStyle={contextMenu.edgeStyle}
          onEdgeColorChange={(edgeId, color) => { editEdge(edgeId, { color }); setContextMenu(null) }}
          onEdgeStyleChange={(edgeId, style) => { editEdge(edgeId, { style }); setContextMenu(null) }}
          onEdgeEditLabel={(edgeId) => {
            const edg = edges.find(e => e.id === edgeId)
            const lbl = prompt("Etiqueta de la conexion:", edg?.label || "")
            if (lbl !== null) editEdge(edgeId, { label: lbl })
            setContextMenu(null)
          }}
          onEdgeDelete={(edgeId) => { removeEdge(edgeId); setContextMenu(null) }}
          isGroupNode={contextMenu.nodeId ? (nodeMap.get(contextMenu.nodeId)?.node_type === 'group') : false}
          isGroupCollapsed={contextMenu.isGroupCollapsed}
          groupColor={contextMenu.groupColor}
          groupLabel={contextMenu.groupLabel}
          nodeGroupId={contextMenu.nodeGroupId}
          isGroupChildrenLocked={contextMenu.isGroupChildrenLocked}
          onRemoveGroupKeepNodes={(id) => { removeGroupKeepNodes(id); setContextMenu(null) }}
          onRemoveGroupWithContent={(id) => { removeGroupWithContent(id); setContextMenu(null) }}
          onToggleGroupCollapsed={(id) => { toggleGroupCollapsed(id); setContextMenu(null) }}
          onSelectGroupContent={(id) => { selectNodesInGroup(id); setContextMenu(null) }}
          onLockGroupChildren={(id, locked) => { lockGroupChildren(id, locked); setContextMenu(null) }}
          onChangeGroupColor={(id, color) => { updateNodeColor(id, color); setContextMenu(null) }}
          onRenameGroup={updateNodeLabel}
          onEjectFromGroup={(nodeId) => { assignNodeToGroup(nodeId, null); setContextMenu(null) }} />
      )}
    </div>
    </div>
  )
}
