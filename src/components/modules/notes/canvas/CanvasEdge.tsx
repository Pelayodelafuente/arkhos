"use client"

import { useState, useCallback } from "react"
import type { CanvasEdge as CanvasEdgeType, CanvasNode, EdgeSide, EdgeStyle } from "@/types/notes"

// ─── Edge Colors ─────────────────────────
const EDGE_COLORS: Record<string, string> = {
  default: 'var(--text-faint)',
  sage: 'var(--module-notas)',
  terracotta: '#C4704A',
  stone: '#8A7A6A',
  blue: '#6B8CC4', /* TODO: revisar #6B8CC4 — color funcional de tipo "blue" */
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
  toSide: EdgeSide
): { path: string; cp1: { x: number; y: number }; cp2: { x: number; y: number } } {
  const dist = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) * 0.4
  const minDist = 40
  const cp = Math.max(dist, minDist)

  let cp1x = from.x, cp1y = from.y, cp2x = to.x, cp2y = to.y

  switch (fromSide) {
    case 'right': cp1x += cp; break
    case 'left': cp1x -= cp; break
    case 'bottom': cp1y += cp; break
    case 'top': cp1y -= cp; break
  }
  switch (toSide) {
    case 'right': cp2x += cp; break
    case 'left': cp2x -= cp; break
    case 'bottom': cp2y += cp; break
    case 'top': cp2y -= cp; break
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

  const fromNode = nodes.get(edge.from_node_id)
  const toNode = nodes.get(edge.to_node_id)
  if (!fromNode || !toNode) return null

  const fromSide: EdgeSide = edge.from_side ?? 'right'
  const toSide: EdgeSide = edge.to_side ?? 'left'

  const from = getAnchorPoint(fromNode, fromSide, scale, offsetX, offsetY)
  const to = getAnchorPoint(toNode, toSide, scale, offsetX, offsetY)
  const { path, cp1, cp2 } = getBezierPath(from, to, fromSide, toSide)
  const color = EDGE_COLORS[edge.color] ?? EDGE_COLORS.default

  const mid = bezierMidpoint(from, cp1, cp2, to)
  const angle = bezierTangentAtEnd(cp2, to)
  const arrowSize = 6 * (isSelected ? 1.15 : 1)
  const arrow = arrowHeadPath(to, angle, arrowSize)
  const edgeStyle: EdgeStyle = edge.style ?? 'arrow'

  // For bidirectional: arrowhead at origin (tangent at t=0, inverted)
  const angleFrom = Math.atan2(from.y - cp1.y, from.x - cp1.x)
  const arrowFrom = arrowHeadPath(from, angleFrom, arrowSize)

  // Stroke widths
  const strokeWidth = isSelected ? 3 / scale : isHovered ? 2 / scale : 1.5 / scale
  const opacity = isSelected ? 1 : isHovered ? 0.8 : 0.6

  // Delete button radius
  const btnR = 10 / scale

  return (
    <g
      data-edge-id={edge.id}
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
