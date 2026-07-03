"use client"

import { useState, useCallback } from "react"
import type { CanvasEdge as CanvasEdgeType, CanvasNode, EdgeSide, EdgeStyle } from "@/types/notes"

// ─── Edge Colors ─────────────────────────
const EDGE_COLORS: Record<string, string> = {
  default: 'var(--text-faint)',
  sage: 'var(--module-notas)',
  terracotta: 'var(--accent-terracotta)',
  stone: '#8A7A6A',
  blue: 'var(--module-gastos)',
  gold: '#C4AA4A',
}

// ─── Props ───────────────────────────────
interface CanvasEdgeProps {
  edge: CanvasEdgeType
  nodes: Map<string, CanvasNode>
  scale: number
  offsetX: number
  offsetY: number
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onEditLabel: (id: string) => void
  onContextMenu: (id: string, e: React.MouseEvent) => void
  parallelIndex?: number
  parallelCount?: number
}

// ─── Geometry Helpers ────────────────────

function getAnchorPoint(
  node: CanvasNode,
  side: EdgeSide,
  scale: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  const x = node.pos_x * scale + offsetX
  const y = node.pos_y * scale + offsetY
  const w = node.width * scale
  const h = node.height * scale

  switch (side) {
    case 'top': return { x: x + w / 2, y }
    case 'bottom': return { x: x + w / 2, y: y + h }
    case 'left': return { x, y: y + h / 2 }
    case 'right': return { x: x + w, y: y + h / 2 }
    default: return { x: x + w, y: y + h / 2 }
  }
}

function getBezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: EdgeSide,
  toSide: EdgeSide,
  parallelOffset: number = 0
): { path: string; cp1: { x: number; y: number }; cp2: { x: number; y: number } } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const h = Math.min(dist * 0.35, 100)
  const minH = 30

  let cp1x = from.x, cp1y = from.y, cp2x = to.x, cp2y = to.y

  switch (fromSide) {
    case 'right': cp1x += Math.max(h, minH); break
    case 'left': cp1x -= Math.max(h, minH); break
    case 'bottom': cp1y += Math.max(h, minH); break
    case 'top': cp1y -= Math.max(h, minH); break
  }
  switch (toSide) {
    case 'right': cp2x += Math.max(h, minH); break
    case 'left': cp2x -= Math.max(h, minH); break
    case 'bottom': cp2y += Math.max(h, minH); break
    case 'top': cp2y -= Math.max(h, minH); break
  }

  // Apply parallel offset: shift control points perpendicularly to the chord
  if (parallelOffset !== 0 && dist > 1) {
    const perpX = -dy / dist
    const perpY = dx / dist
    cp1x += perpX * parallelOffset
    cp1y += perpY * parallelOffset
    cp2x += perpX * parallelOffset
    cp2y += perpY * parallelOffset
  }

  return {
    path: `M ${from.x} ${from.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${to.x} ${to.y}`,
    cp1: { x: cp1x, y: cp1y },
    cp2: { x: cp2x, y: cp2y },
  }
}

/** Cubic Bezier midpoint at t=0.5: B(0.5) = 0.125*P0 + 0.375*C1 + 0.375*C2 + 0.125*P3 */
function bezierMidpoint(
  from: { x: number; y: number },
  cp1: { x: number; y: number },
  cp2: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: 0.125 * from.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * to.x,
    y: 0.125 * from.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * to.y,
  }
}

/** Get tangent angle at t=1 for arrowhead direction */
function bezierTangentAtEnd(
  cp2: { x: number; y: number },
  to: { x: number; y: number }
): number {
  return Math.atan2(to.y - cp2.y, to.x - cp2.x)
}

/** Build arrowhead triangle path at destination */
function arrowHeadPath(
  to: { x: number; y: number },
  angle: number,
  size: number
): string {
  const ax = to.x - size * Math.cos(angle - Math.PI / 7)
  const ay = to.y - size * Math.sin(angle - Math.PI / 7)
  const bx = to.x - size * Math.cos(angle + Math.PI / 7)
  const by = to.y - size * Math.sin(angle + Math.PI / 7)
  return `M ${to.x} ${to.y} L ${ax} ${ay} L ${bx} ${by} Z`
}

// ─── Component ───────────────────────────

export function CanvasEdgeComponent({
  edge,
  nodes,
  scale,
  offsetX,
  offsetY,
  isSelected,
  onSelect,
  onDelete,
  onEditLabel,
  onContextMenu,
  parallelIndex = 0,
  parallelCount = 1,
}: CanvasEdgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Hooks must come before any early return
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(edge.id)
  }, [edge.id, onSelect])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onEditLabel(edge.id)
  }, [edge.id, onEditLabel])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(edge.id, e)
  }, [edge.id, onContextMenu])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(edge.id)
  }, [edge.id, onDelete])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent canvas from starting pan/deselectAll when clicking an edge
    e.stopPropagation()
  }, [])

  const fromNode = nodes.get(edge.from_node_id)
  const toNode = nodes.get(edge.to_node_id)
  if (!fromNode || !toNode) return null

  const fromSide: EdgeSide = edge.from_side ?? 'right'
  const toSide: EdgeSide = edge.to_side ?? 'left'

  const from = getAnchorPoint(fromNode, fromSide, scale, offsetX, offsetY)
  const to = getAnchorPoint(toNode, toSide, scale, offsetX, offsetY)
  const parallelOffset = parallelCount > 1
    ? (parallelIndex - (parallelCount - 1) / 2) * 16
    : 0
  const { path: bezierPath, cp1, cp2 } = getBezierPath(from, to, fromSide, toSide, parallelOffset)
  const color = EDGE_COLORS[edge.color] ?? EDGE_COLORS.default
  const edgeStyle: EdgeStyle = edge.style ?? 'arrow'

  // Line style: straight path; others: bezier
  const path = edgeStyle === 'line'
    ? `M ${from.x} ${from.y} L ${to.x} ${to.y}`
    : bezierPath

  const mid = edgeStyle === 'line'
    ? { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    : bezierMidpoint(from, cp1, cp2, to)
  const angle = edgeStyle === 'line'
    ? Math.atan2(to.y - from.y, to.x - from.x)
    : bezierTangentAtEnd(cp2, to)
  const arrowSize = 6 * (isSelected ? 1.15 : 1)
  const arrow = arrowHeadPath(to, angle, arrowSize)

  // For bidirectional: arrowhead at origin
  const angleFrom = edgeStyle === 'line'
    ? Math.atan2(from.y - to.y, from.x - to.x)
    : Math.atan2(from.y - cp1.y, from.x - cp1.x)
  const arrowFrom = arrowHeadPath(from, angleFrom, arrowSize)

  // Stroke widths
  const strokeWidth = isSelected ? 3 / scale : isHovered ? 2 / scale : 1.5 / scale
  const opacity = isSelected ? 1 : isHovered ? 0.8 : 0.6

  // Delete button radius
  const btnR = 10 / scale

  return (
    <g
      data-edge-id={edge.id}
      style={{ pointerEvents: 'auto' }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible fat path for easier clicking */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth={16}
        fill="none"
        className="cursor-pointer"
        style={{ pointerEvents: 'all' }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />

      {/* Hover highlight path */}
      {(isHovered || isSelected) && (
        <path
          d={path}
          stroke={color}
          strokeWidth={(isSelected ? 6 : 4) / scale}
          fill="none"
          strokeLinecap="round"
          opacity={0.12}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Visible path */}
      <path
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        opacity={opacity}
        className="transition-all duration-150"
        style={{ pointerEvents: 'none' }}
      />

      {/* Arrowhead at destination (arrow + bidirectional) */}
      {edgeStyle !== 'line' && (
        <path
          d={arrow}
          fill={color}
          opacity={opacity}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Arrowhead at origin (bidirectional only) */}
      {edgeStyle === 'bidirectional' && (
        <path
          d={arrowFrom}
          fill={color}
          opacity={opacity}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Label */}
      {edge.label && (
        <text
          x={mid.x}
          y={mid.y - 8 / scale}
          textAnchor="middle"
          fill="#5a3e28"
          fontSize={(isSelected ? 13 : 12) / scale}
          fontFamily="Plus Jakarta Sans, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {edge.label}
        </text>
      )}

      {/* Delete button when selected */}
      {isSelected && (
        <g className="cursor-pointer" onClick={handleDelete}>
          <circle
            cx={mid.x}
            cy={mid.y}
            r={btnR}
            fill="white"
            stroke={color}
            strokeWidth={1.5 / scale}
          />
          <line
            x1={mid.x - 3 / scale}
            y1={mid.y - 3 / scale}
            x2={mid.x + 3 / scale}
            y2={mid.y + 3 / scale}
            stroke="#e74c3c"
            strokeWidth={1.5 / scale}
          />
          <line
            x1={mid.x + 3 / scale}
            y1={mid.y - 3 / scale}
            x2={mid.x - 3 / scale}
            y2={mid.y + 3 / scale}
            stroke="#e74c3c"
            strokeWidth={1.5 / scale}
          />
        </g>
      )}
    </g>
  )
}
