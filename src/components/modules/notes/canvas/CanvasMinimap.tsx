"use client"

import { useCallback, useRef, useState } from "react"
import type { CanvasNode, CanvasViewport } from "@/types/notes"
import { NOTE_COLOR_CONFIG } from "@/types/notes"

interface Props {
  nodes: CanvasNode[]
  viewport: CanvasViewport
  containerWidth: number
  containerHeight: number
  onViewportChange: (vp: Partial<CanvasViewport>) => void
}

const MINIMAP_W = 200
const MINIMAP_H = 140
const PADDING = 20

function getColorForNode(color: string): string {
  const cfg = NOTE_COLOR_CONFIG.find((c) => c.value === color)
  return cfg?.border ?? "#B0A48F"
}

export function CanvasMinimap({
  nodes,
  viewport,
  containerWidth,
  containerHeight,
  onViewportChange,
}: Props) {
  const minimapRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  // Calculate bounding box of all nodes
  const bounds = (() => {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 700 }
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const node of nodes) {
      minX = Math.min(minX, node.pos_x)
      minY = Math.min(minY, node.pos_y)
      maxX = Math.max(maxX, node.pos_x + node.width)
      maxY = Math.max(maxY, node.pos_y + node.height)
    }
    return { minX: minX - PADDING, minY: minY - PADDING, maxX: maxX + PADDING, maxY: maxY + PADDING }
  })()

  const worldW = bounds.maxX - bounds.minX
  const worldH = bounds.maxY - bounds.minY

  // Scale to fit minimap
  const scaleX = MINIMAP_W / worldW
  const scaleY = MINIMAP_H / worldH
  const mapScale = Math.min(scaleX, scaleY)

  const toMinimap = (wx: number, wy: number) => ({
    x: (wx - bounds.minX) * mapScale,
    y: (wy - bounds.minY) * mapScale,
  })

  // Viewport rectangle in world coordinates
  const vpWorldX = -viewport.offsetX / viewport.scale
  const vpWorldY = -viewport.offsetY / viewport.scale
  const vpWorldW = containerWidth / viewport.scale
  const vpWorldH = containerHeight / viewport.scale

  const vpMinimap = toMinimap(vpWorldX, vpWorldY)
  const vpMinimapW = vpWorldW * mapScale
  const vpMinimapH = vpWorldH * mapScale

  const handlePointerEvent = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = minimapRef.current?.getBoundingClientRect()
      if (!rect) return

      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      // Convert minimap coords to world coords (center viewport there)
      const worldX = mx / mapScale + bounds.minX
      const worldY = my / mapScale + bounds.minY

      onViewportChange({
        offsetX: -(worldX - vpWorldW / 2) * viewport.scale,
        offsetY: -(worldY - vpWorldH / 2) * viewport.scale,
      })
    },
    [mapScale, bounds.minX, bounds.minY, vpWorldW, vpWorldH, viewport.scale, onViewportChange]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setDragging(true)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      handlePointerEvent(e)
    },
    [handlePointerEvent]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return
      handlePointerEvent(e)
    },
    [dragging, handlePointerEvent]
  )

  const onPointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  return (
    <div
      ref={minimapRef}
      className="absolute bottom-4 left-4 z-30 overflow-hidden rounded-xl border border-border bg-card/90 backdrop-blur-sm"
      style={{ width: MINIMAP_W, height: MINIMAP_H, cursor: dragging ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Node rectangles */}
      {nodes.map((node) => {
        const pos = toMinimap(node.pos_x, node.pos_y)
        const w = node.width * mapScale
        const h = node.height * mapScale
        return (
          <div
            key={node.id}
            className="absolute rounded-[2px]"
            style={{
              left: pos.x,
              top: pos.y,
              width: Math.max(w, 3),
              height: Math.max(h, 2),
              backgroundColor: getColorForNode(node.color),
              opacity: 0.85,
            }}
          />
        )
      })}

      {/* Viewport indicator */}
      <div
        className="absolute rounded-sm border-[1.5px] border-blue-500/60 bg-blue-400/15"
        style={{
          left: vpMinimap.x,
          top: vpMinimap.y,
          width: vpMinimapW,
          height: vpMinimapH,
        }}
      />
    </div>
  )
}
