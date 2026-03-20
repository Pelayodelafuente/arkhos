"use client"

import { FileText, Type, Link, Layers } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import * as LucideIcons from "lucide-react"
import type { CanvasNode as CanvasNodeType, NoteColor } from "@/types/notes"

const NODE_COLORS: Record<NoteColor, { bg: string; border: string }> = {
  default: { bg: '#FAF7F2', border: '#E2D9CA' },
  sage: { bg: '#eef3ee', border: '#7a9b76' },
  terracotta: { bg: '#faf0ec', border: '#C4704A' },
  stone: { bg: '#f5f2ee', border: '#B0A48F' },
  blue: { bg: '#eef2f8', border: '#6B8CC4' },
  gold: { bg: '#faf5ec', border: '#C4974A' },
}

interface Props {
  node: CanvasNodeType
  scale: number
  offsetX: number
  offsetY: number
  isSelected: boolean
  onSelect: (id: string) => void
  onDragStart: (id: string, e: React.MouseEvent | React.TouchEvent) => void
  onDoubleClick: (node: CanvasNodeType) => void
  onConnectionStart: (nodeId: string, side: string) => void
}

export function CanvasNodeComponent({
  node, scale, offsetX, offsetY, isSelected, onSelect, onDragStart, onDoubleClick, onConnectionStart,
}: Props) {
  const colors = NODE_COLORS[node.color as NoteColor] ?? NODE_COLORS.default

  const screenX = node.pos_x * scale + offsetX
  const screenY = node.pos_y * scale + offsetY
  const screenW = node.width * scale
  const screenH = node.height * scale

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(node.id)
    if (e.button === 0) onDragStart(node.id, e)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    onSelect(node.id)
    onDragStart(node.id, e)
  }

  // Get icon for note nodes
  const noteIcon = node.node_type === 'note' && node.note?.icon
    ? (LucideIcons as unknown as Record<string, LucideIcon>)[node.note.icon] ?? FileText
    : null

  const NodeIcon: LucideIcon = node.node_type === 'text' ? Type
    : node.node_type === 'url' ? Link
    : node.node_type === 'group' ? Layers
    : noteIcon ?? FileText

  const title = node.node_type === 'note' ? (node.note?.title ?? 'Sin titulo')
    : node.node_type === 'url' ? (node.url || 'URL')
    : node.node_type === 'group' ? (node.label || 'Grupo')
    : ''

  const preview = node.node_type === 'note'
    ? (node.note?.content ?? '').replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').replace(/`/g, '').slice(0, 120)
    : node.node_type === 'text'
    ? node.content
    : ''

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        backgroundColor: colors.bg,
        borderColor: isSelected ? '#C4704A' : colors.border,
        borderWidth: isSelected ? 2 : 1,
        borderStyle: 'solid',
        borderRadius: 12,
        zIndex: isSelected ? 100 : node.z_index,
        cursor: 'grab',
        transition: 'border-color 150ms, box-shadow 150ms',
        boxShadow: isSelected ? '0 4px 20px rgba(26,23,20,0.12)' : '0 1px 4px rgba(26,23,20,0.04)',
        overflow: 'hidden',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node) }}
    >
      {/* Content */}
      <div style={{ padding: `${8 * scale}px ${10 * scale}px`, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 * scale, marginBottom: 4 * scale }}>
          <NodeIcon size={14 * scale} strokeWidth={1.75} style={{ color: colors.border, flexShrink: 0 }} />
          <span style={{
            fontSize: 12 * scale,
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {title}
          </span>
        </div>
        {preview && (
          <p style={{
            fontSize: 10 * scale,
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
            overflow: 'hidden',
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
          }}>
            {preview}
          </p>
        )}
        {node.node_type === 'note' && node.note?.tags && node.note.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 3 * scale, marginTop: 'auto', paddingTop: 4 * scale }}>
            {node.note.tags.slice(0, 2).map((tag) => (
              <span key={tag} style={{
                fontSize: 8 * scale,
                padding: `${1 * scale}px ${4 * scale}px`,
                borderRadius: 4 * scale,
                backgroundColor: 'rgba(0,0,0,0.05)',
                color: 'var(--text-tertiary)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Connection points (visible when selected) */}
      {isSelected && (
        <>
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
            const positions: Record<string, React.CSSProperties> = {
              top: { top: -5, left: '50%', transform: 'translateX(-50%)' },
              bottom: { bottom: -5, left: '50%', transform: 'translateX(-50%)' },
              left: { left: -5, top: '50%', transform: 'translateY(-50%)' },
              right: { right: -5, top: '50%', transform: 'translateY(-50%)' },
            }
            return (
              <div
                key={side}
                style={{
                  position: 'absolute',
                  ...positions[side],
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#7a9b76',
                  border: '2px solid white',
                  cursor: 'crosshair',
                  zIndex: 101,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  onConnectionStart(node.id, side)
                }}
              />
            )
          })}
        </>
      )}
    </div>
  )
}
