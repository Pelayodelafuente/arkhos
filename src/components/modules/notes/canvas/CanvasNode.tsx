"use client"

import { useCallback, useMemo, useRef } from "react"
import { marked } from "marked"
import { useState } from "react"
import { FileText, Type, Link, ExternalLink, Layers, Lock, Image as ImageIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import * as LucideIcons from "lucide-react"
import type { CanvasNode as CanvasNodeType, CanvasViewport } from "@/types/notes"
import { NOTE_COLOR_CONFIG } from "@/types/notes"

// ─── Marked config ────────────────────────────
marked.setOptions({ breaks: true, gfm: true })

function sanitizeHtml(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
}

// ─── Color lookup ─────────────────────────────
const COLOR_MAP = Object.fromEntries(
  NOTE_COLOR_CONFIG.map((c) => [c.value, { bg: c.bg, border: c.border }])
) as Record<string, { bg: string; border: string }>

// ─── Image URL filename extractor ────────────
function extractFilenameFromUrl(url: string): string {
  if (!url) return ""
  try {
    const pathname = new URL(url).pathname
    const segments = pathname.split("/")
    const last = segments[segments.length - 1] ?? ""
    // Remove timestamp prefix (e.g. "1234567890-filename.png" → "filename.png")
    return last.replace(/^\d+-/, "").replace(/_/g, " ")
  } catch {
    return ""
  }
}

function extractDomain(url: string): string {
  if (!url) return "URL"
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// ─── Resize handles ───────────────────────────
const RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const

function getHandleStyle(handle: string): React.CSSProperties {
  const size = 8
  const half = -size / 2
  const base: React.CSSProperties = {
    position: "absolute", width: size, height: size,
    background: "#C4704A", borderRadius: 2, zIndex: 102,
  }
  const map: Record<string, React.CSSProperties> = {
    nw: { top: half, left: half, cursor: "nwse-resize" },
    n:  { top: half, left: "50%", marginLeft: half, cursor: "ns-resize" },
    ne: { top: half, right: half, cursor: "nesw-resize" },
    e:  { top: "50%", right: half, marginTop: half, cursor: "ew-resize" },
    se: { bottom: half, right: half, cursor: "nwse-resize" },
    s:  { bottom: half, left: "50%", marginLeft: half, cursor: "ns-resize" },
    sw: { bottom: half, left: half, cursor: "nesw-resize" },
    w:  { top: "50%", left: half, marginTop: half, cursor: "ew-resize" },
  }
  return { ...base, ...map[handle] }
}

// ─── Props ────────────────────────────────────
interface Props {
  node: CanvasNodeType
  viewport: CanvasViewport
  isSelected: boolean
  isEditing: boolean
  onSelect: (id: string, additive: boolean) => void
  onDragStart: (id: string, e: React.MouseEvent | React.TouchEvent) => void
  onDoubleClick: (node: CanvasNodeType) => void
  onConnectionStart: (nodeId: string, side: string) => void
  onResizeStart: (nodeId: string, handle: string, e: React.MouseEvent) => void
  onContentChange: (id: string, content: string) => void
}

// ─── Component ────────────────────────────────
export function CanvasNodeComponent({
  node, viewport, isSelected, isEditing,
  onSelect, onDragStart, onDoubleClick,
  onConnectionStart, onResizeStart, onContentChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { scale, offsetX, offsetY } = viewport

  const colors = COLOR_MAP[node.color] ?? COLOR_MAP.default
  const screenX = node.pos_x * scale + offsetX
  const screenY = node.pos_y * scale + offsetY
  const screenW = node.width * scale
  const screenH = node.height * scale
  const isGroup = node.node_type === "group"

  // ─── Icon resolution ────────────────────
  const NodeIcon: LucideIcon = useMemo(() => {
    if (node.node_type === "text") return Type
    if (node.node_type === "url") return Link
    if (node.node_type === "group") return Layers
    if (node.node_type === "image") return ImageIcon
    if (node.node_type === "note" && node.note?.icon) {
      return (LucideIcons as unknown as Record<string, LucideIcon>)[node.note.icon] ?? FileText
    }
    return FileText
  }, [node.node_type, node.note?.icon])

  // ─── Derived content ────────────────────
  const title = node.node_type === "note" ? (node.note?.title ?? "Sin titulo")
    : node.node_type === "url" ? extractDomain(node.url || "")
    : node.node_type === "group" ? (node.label || "Grupo")
    : node.node_type === "image" ? (node.label || extractFilenameFromUrl(node.url) || "Imagen")
    : ""

  const [imageError, setImageError] = useState(false)

  const rawContent = node.node_type === "note"
    ? (node.note?.content ?? "")
    : node.content

  const htmlContent = useMemo(
    () => sanitizeHtml(marked.parse(rawContent) as string),
    [rawContent],
  )

  // ─── Handlers ───────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(node.id, e.shiftKey)
    if (e.button === 0 && !isEditing) onDragStart(node.id, e)
  }, [node.id, isEditing, onSelect, onDragStart])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    onSelect(node.id, false)
    if (!isEditing) onDragStart(node.id, e)
  }, [node.id, isEditing, onSelect, onDragStart])

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDoubleClick(node)
  }, [node, onDoubleClick])

  // ─── Group node ─────────────────────────
  if (isGroup) {
    return (
      <div
        className="group/node"
        style={{
          position: "absolute", left: screenX, top: screenY,
          width: screenW, height: screenH,
          backgroundColor: `${colors.bg}88`,
          borderColor: isSelected ? "#C4704A" : colors.border,
          borderWidth: isSelected ? 2 : 1.5,
          borderStyle: "dashed", borderRadius: 12,
          zIndex: node.z_index,
          cursor: "grab",
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDblClick}
      >
        <div style={{
          padding: `${6 * scale}px ${10 * scale}px`,
          display: "flex", alignItems: "center", gap: 4 * scale,
        }}>
          <Layers size={13 * scale} strokeWidth={1.75} style={{ color: colors.border }} />
          <span style={{
            fontSize: 11 * scale, fontWeight: 600,
            color: "var(--text-secondary)", letterSpacing: "0.02em",
          }}>
            {title}
          </span>
          {node.locked && <Lock size={10 * scale} style={{ color: "var(--text-tertiary)", marginLeft: "auto" }} />}
        </div>

        {/* Resize handles */}
        {(isSelected || false) && RESIZE_HANDLES.map((h) => (
          <div key={h} style={{ ...getHandleStyle(h), opacity: node.locked ? 0.3 : 1 }}
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(node.id, h, e) }} />
        ))}

        {/* Connection anchors — visible on hover and selected */}
        {(["top", "right", "bottom", "left"] as const).map((side) => {
          const pos: Record<string, React.CSSProperties> = {
            top: { top: -4, left: "50%", transform: "translateX(-50%)" },
            bottom: { bottom: -4, left: "50%", transform: "translateX(-50%)" },
            left: { left: -4, top: "50%", transform: "translateY(-50%)" },
            right: { right: -4, top: "50%", transform: "translateY(-50%)" },
          }
          const size = isSelected ? 10 : 8
          return (
            <div
              key={side}
              className={`${isSelected ? "" : "opacity-0 group-hover/node:opacity-60"}`}
              style={{
                position: "absolute", ...pos[side],
                width: size, height: size, borderRadius: "50%",
                backgroundColor: "#7a9b76", border: "2px solid white",
                cursor: "crosshair", zIndex: 103,
                transition: "opacity 150ms, transform 150ms",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = `${pos[side]?.transform ?? ""} scale(1.3)` }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = pos[side]?.transform as string ?? "" }}
              onMouseDown={(e) => { e.stopPropagation(); onConnectionStart(node.id, side) }}
            />
          )
        })}
      </div>
    )
  }

  // ─── Standard node ──────────────────────
  return (
    <div
      className="group/node"
      style={{
        position: "absolute", left: screenX, top: screenY,
        width: screenW, height: screenH,
        backgroundColor: colors.bg,
        borderColor: isSelected ? "#C4704A" : colors.border,
        borderWidth: isSelected ? 2 : 1,
        borderStyle: "solid", borderRadius: 12,
        zIndex: isSelected ? 100 : node.z_index,
        cursor: isEditing ? "text" : "grab",
        transition: "border-color 150ms, box-shadow 150ms",
        boxShadow: isSelected ? "0 4px 20px rgba(26,23,20,0.12)" : "0 1px 4px rgba(26,23,20,0.04)",
        overflow: "hidden",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDblClick}
    >
      {/* Content area */}
      <div style={{
        padding: `${8 * scale}px ${10 * scale}px`,
        height: "100%", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 * scale, marginBottom: 4 * scale }}>
          <NodeIcon size={14 * scale} strokeWidth={1.75} style={{ color: colors.border, flexShrink: 0 }} />
          <span style={{
            fontSize: 12 * scale, fontWeight: 600,
            color: "var(--text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {title}
          </span>
          {node.locked && <Lock size={11 * scale} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />}
        </div>

        {/* Body — editing vs preview vs image vs url */}
        {node.node_type === "url" ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            justifyContent: "center", gap: 2 * scale,
            borderLeft: `${2 * scale}px solid #7a9b76`,
            paddingLeft: 6 * scale,
            overflow: "hidden",
          }}>
            <span
              className="font-heading"
              style={{
                fontSize: 11 * scale, fontWeight: 500,
                color: "var(--text-primary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {title}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 9 * scale,
                color: "var(--text-tertiary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {node.url}
            </span>
            <button
              style={{
                display: "inline-flex", alignItems: "center", gap: 3 * scale,
                fontSize: 9 * scale, color: "#7a9b76",
                background: "none", border: "none", cursor: "pointer",
                padding: 0, marginTop: 2 * scale,
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (node.url) window.open(node.url, "_blank", "noopener,noreferrer")
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <ExternalLink size={10 * scale} strokeWidth={1.75} />
              <span>Abrir</span>
            </button>
          </div>
        ) : node.node_type === "image" ? (
          <div style={{ flex: 1, overflow: "hidden", borderRadius: "0 0 8px 8px", minHeight: 0 }}>
            {imageError ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", height: "100%", gap: 4 * scale,
                color: "var(--text-tertiary)",
              }}>
                <ImageIcon size={24 * scale} strokeWidth={1.5} />
                <span style={{ fontSize: 9 * scale }}>Error al cargar imagen</span>
              </div>
            ) : (
              <img
                src={node.url}
                alt={node.label || "Imagen"}
                loading="lazy"
                onError={() => setImageError(true)}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "contain",
                  borderRadius: "0 0 8px 8px",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                draggable={false}
              />
            )}
          </div>
        ) : isEditing && node.node_type === "text" ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={rawContent}
            onChange={(e) => onContentChange(node.id, e.target.value)}
            style={{
              flex: 1, width: "100%", resize: "none",
              fontSize: 11 * scale, lineHeight: 1.5,
              color: "var(--text-primary)",
              background: "transparent", border: "none", outline: "none",
              fontFamily: "var(--font-sans)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : rawContent ? (
          <div
            className="canvas-node-prose"
            style={{
              fontSize: 10 * scale, lineHeight: 1.5,
              color: "var(--text-secondary)",
              overflow: "hidden", flex: 1,
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : null}

        {/* Tags for note nodes */}
        {node.node_type === "note" && node.note?.tags && node.note.tags.length > 0 && (
          <div style={{ display: "flex", gap: 3 * scale, marginTop: "auto", paddingTop: 4 * scale }}>
            {node.note.tags.slice(0, 2).map((tag) => (
              <span key={tag} style={{
                fontSize: 8 * scale,
                padding: `${1 * scale}px ${4 * scale}px`,
                borderRadius: 4 * scale,
                backgroundColor: "rgba(0,0,0,0.05)",
                color: "var(--text-tertiary)",
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Resize handles — visible on hover or selected */}
      {RESIZE_HANDLES.map((h) => (
        <div
          key={h}
          style={{
            ...getHandleStyle(h),
            opacity: 0,
            transition: "opacity 150ms",
            ...(isSelected ? { opacity: node.locked ? 0.3 : 1 } : {}),
          }}
          className="group-hover/node:!opacity-100"
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(node.id, h, e) }}
        />
      ))}

      {/* Connection anchor points — visible on hover (subtle) and selected (full) */}
      {(["top", "right", "bottom", "left"] as const).map((side) => {
        const pos: Record<string, React.CSSProperties> = {
          top: { top: -4, left: "50%", transform: "translateX(-50%)" },
          bottom: { bottom: -4, left: "50%", transform: "translateX(-50%)" },
          left: { left: -4, top: "50%", transform: "translateY(-50%)" },
          right: { right: -4, top: "50%", transform: "translateY(-50%)" },
        }
        const size = isSelected ? 10 : 8
        return (
          <div
            key={side}
            className={`${isSelected ? "" : "opacity-0 group-hover/node:opacity-60"}`}
            style={{
              position: "absolute", ...pos[side],
              width: size, height: size, borderRadius: "50%",
              backgroundColor: "#7a9b76", border: "2px solid white",
              cursor: "crosshair", zIndex: 103,
              transition: "opacity 150ms, transform 150ms",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = `${pos[side]?.transform ?? ""} scale(1.3)` }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = pos[side]?.transform as string ?? "" }}
            onMouseDown={(e) => { e.stopPropagation(); onConnectionStart(node.id, side) }}
          />
        )
      })}
    </div>
  )
}
