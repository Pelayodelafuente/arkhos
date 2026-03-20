"use client"

import type { CanvasEdge as CanvasEdgeType, CanvasNode } from "@/types/notes"

const EDGE_COLORS: Record<string, string> = {
  default: '#B0A48F',
  sage: '#7a9b76',
  terracotta: '#C4704A',
  stone: '#8A7A6A',
  blue: '#6B8CC4',
}

interface Props {
  edge: CanvasEdgeType
  nodes: Map<string, CanvasNode>
  scale: number
  offsetX: number
  offsetY: number
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function getAnchorPoint(node: CanvasNode, side: string, scale: number, offsetX: number, offsetY: number) {
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

function getBezierPath(from: { x: number; y: number }, to: { x: number; y: number }, fromSide: string, toSide: string) {
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

  return `M ${from.x} ${from.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${to.x} ${to.y}`
}

export function CanvasEdgeComponent({ edge, nodes, scale, offsetX, offsetY, isSelected, onSelect, onDelete }: Props) {
  const fromNode = nodes.get(edge.from_node_id)
  const toNode = nodes.get(edge.to_node_id)
  if (!fromNode || !toNode) return null

  const from = getAnchorPoint(fromNode, edge.from_side, scale, offsetX, offsetY)
  const to = getAnchorPoint(toNode, edge.to_side, scale, offsetX, offsetY)
  const path = getBezierPath(from, to, edge.from_side, edge.to_side)
  const color = EDGE_COLORS[edge.color] ?? EDGE_COLORS.default

  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2

  return (
    <g>
      {/* Invisible fat path for easier clicking */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth={16}
        fill="none"
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onSelect(edge.id) }}
      />
      {/* Visible path */}
      <path
        d={path}
        stroke={color}
        strokeWidth={isSelected ? 2.5 : 1.5}
        fill="none"
        strokeLinecap="round"
        opacity={isSelected ? 1 : 0.6}
        className="transition-all duration-150"
      />
      {/* Arrow head at destination */}
      <circle cx={to.x} cy={to.y} r={3 * (isSelected ? 1.2 : 1)} fill={color} opacity={isSelected ? 1 : 0.6} />
      {/* Label */}
      {edge.label && (
        <text x={midX} y={midY - 8} textAnchor="middle" className="text-[10px] fill-text-secondary" style={{ fontSize: 10 }}>
          {edge.label}
        </text>
      )}
      {/* Delete button on selected */}
      {isSelected && (
        <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(edge.id) }}>
          <circle cx={midX} cy={midY} r={10} fill="white" stroke={color} strokeWidth={1.5} />
          <line x1={midX - 3} y1={midY - 3} x2={midX + 3} y2={midY + 3} stroke="#e74c3c" strokeWidth={1.5} />
          <line x1={midX + 3} y1={midY - 3} x2={midX - 3} y2={midY + 3} stroke="#e74c3c" strokeWidth={1.5} />
        </g>
      )}
    </g>
  )
}
