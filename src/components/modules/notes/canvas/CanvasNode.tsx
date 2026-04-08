"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { marked } from "marked"
import { FileText, Type, Link, ExternalLink, Lock, Image as ImageIcon } from "lucide-react"
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

// ─── Connection handle positions ──────────────
const CONNECTION_POS: Record<string, React.CSSProperties> = {
  top: { top: -6, left: "50%", transform: "translateX(-50%)" },
  bottom: { bottom: -6, left: "50%", transform: "translateX(-50%)" },
  left: { left: -6, top: "50%", transform: "translateY(-50%)" },
  right: { right: -6, top: "50%", transform: "translateY(-50%)" },
}

// ─── Props ────────────────────────────────────
interface Props {
  node: CanvasNodeType
  viewport: CanvasViewport
  isSelected: boolean
  isEditing: boolean
  isConnectionTarget?: boolean
  searchDimmed?: boolean
  onSelect: (id: string, additive: boolean) => void
  onDragStart: (id: string, e: React.MouseEvent | React.TouchEvent) => void
  onDoubleClick: (node: CanvasNodeType) => void
  onConnectionStart: (nodeId: string, side: string) => void
  onResizeStart: (nodeId: string, handle: string, e: React.MouseEvent) => void
  onContentChange: (id: string, content: string) => void
  onLabelChange?: (id: string, label: string) => void
  isConnecting?: boolean
}

// ─── Component ────────────────────────────────
export function CanvasNodeComponent({
  node, viewport, isSelected, isEditing,
  isConnectionTarget = false, searchDimmed = false,
  isConnecting = false,
  onSelect, onDragStart, onDoubleClick,
  onConnectionStart, onResizeStart, onContentChange, onLabelChange: _onLabelChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { scale, offsetX, offsetY } = viewport

  const colors = COLOR_MAP[node.color] ?? COLOR_MAP.default
  const screenX = node.pos_x * scale + offsetX
  const screenY = node.pos_y * scale + offsetY
  const screenW = node.width * scale
  const screenH = node.height * scale

  const [imageError, setImageError] = useState(false)

  // ─── Icon resolution ────────────────────
  const NodeIcon: LucideIcon = useMemo(() => {
    if (node.node_type === "text") return Type
    if (node.node_type === "url") return Link
    if (node.node_type === "image") return ImageIcon
    if (node.node_type === "note" && node.note?.icon) {
      return (LucideIcons as unknown as Record<string, LucideIcon>)[node.note.icon] ?? FileText
    }
    return FileText
  }, [node.node_type, node.note?.icon])

  // ─── Derived content ────────────────────
  const title = node.node_type === "note" ? (node.note?.title ?? "Sin titulo")
    : node.node_type === "url" ? extractDomain(node.url || "")
    : node.node_type === "image" ? (node.label || extractFilenameFromUrl(node.url) || "Imagen")
    : ""

  const rawContent = node.node_type === "note"
    ? (node.note?.content ?? "")
    : node.content

  const htmlContent = useMemo(
    () => sanitizeHtml(marked.parse(rawContent) as string),
    [rawContent],
  )

  // ─── Auto-focus textarea on edit ────────
  useEffect(() => {
    if (isEditing && node.node_type === "text" && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing, node.node_type])

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

  const handleTextareaBlur = useCallback(() => {
    // Text node blur: content is already saved via onChange
  }, [])

  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      ;(e.target as HTMLTextAreaElement).blur()
    }
  }, [])

  // ─── Connection handles (shared) ────────
  const renderConnectionHandles = () => (
    (["top", "right", "bottom", "left"] as const).map((side) => {
      const handleSize = isConnecting ? 14 : 12
      const portColor = isConnecting ? "#5B8C6A" : "#B07A3A"
      const visibilityClass = isConnecting
        ? "opacity-80"
        : (isSelected ? "" : "opacity-0 group-hover/node:opacity-60")
      return (
        <div
          key={side}
          className={visibilityClass}
          style={{
            position: "absolute", ...CONNECTION_POS[side],
            width: handleSize, height: handleSize, borderRadius: "50%",
            backgroundColor: portColor, border: "2px solid white",
            cursor: "crosshair", zIndex: 103,
            transition: "opacity 150ms, transform 150ms",
            boxShadow: isConnecting ? `0 0 0 3px ${portColor}33` : undefined,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform =
              `${CONNECTION_POS[side]?.transform ?? ""} scale(1.3)`
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform =
              CONNECTION_POS[side]?.transform as string ?? ""
          }}
          onMouseDown={(e) => { e.stopPropagation(); onConnectionStart(node.id, side) }}
        />
      )
    })
  )

  // ─── Resize handles (shared) ────────────
  const renderResizeHandles = (alwaysShow: boolean) => (
    RESIZE_HANDLES.map((h) => (
      <div
        key={h}
        style={{
          ...getHandleStyle(h),
          opacity: 0,
          transition: "opacity 150ms",
          ...(isSelected || alwaysShow ? { opacity: node.locked ? 0.3 : 1 } : {}),
        }}
        className="group-hover/node:!opacity-100"
        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(node.id, h, e) }}
      />
    ))
  )

  // ─── Wrapper styles for search dimming & connection target ─
  const wrapperTransitions = "border-color 150ms ease, box-shadow 150ms ease, opacity 200ms ease, transform 150ms ease"

  // ─── Node ───────────────────────────────
  return (
    <div
      data-node-id={node.id}
      className="group/node"
      style={{
        position: "absolute", left: screenX, top: screenY,
        width: screenW, height: screenH,
        backgroundColor: node.node_type === "url" ? colors.bg : colors.bg,
        borderColor: isConnectionTarget ? "#B07A3A" : colors.border,
        borderWidth: 1,
        borderStyle: "solid", borderRadius: 12,
        zIndex: isSelected ? 100 : node.z_index,
        cursor: isEditing ? "text" : "grab",
        transition: wrapperTransitions,
        boxShadow: isConnectionTarget
          ? "0 0 0 3px rgba(122, 155, 118, 0.3)"
          : isSelected
            ? "0 0 0 2px #C4704A, 0 4px 16px rgba(26,23,20,0.10)"
            : "0 1px 4px rgba(26,23,20,0.04)",
        overflow: "hidden",
        ...(isConnectionTarget ? { transform: "scale(1.02)" } : {}),
        ...(searchDimmed ? {
          opacity: 0.3,
          pointerEvents: "none" as const,
        } : {}),
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
          {node.node_type === "url" && node.url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://www.google.com/s2/favicons?domain=${extractDomain(node.url)}&sz=32`}
                alt=""
                style={{
                  width: 14 * scale, height: 14 * scale,
                  borderRadius: 2, flexShrink: 0,
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none"
                }}
              />
              <Link size={14 * scale} strokeWidth={1.75} style={{
                color: "#B07A3A", flexShrink: 0,
              }} />
            </>
          ) : (
            <NodeIcon size={14 * scale} strokeWidth={1.75} style={{ color: colors.border, flexShrink: 0 }} />
          )}
          <span style={{
            fontSize: 12 * scale, fontWeight: 600,
            color: "var(--text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {title}
          </span>
          {node.locked && <Lock size={11 * scale} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />}
        </div>

        {/* Body — url / image / text editing / markdown preview */}
        {node.node_type === "url" ? (
          <div
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              justifyContent: "center", gap: 2 * scale,
              borderLeft: `${2 * scale}px solid #B07A3A`,
              paddingLeft: 6 * scale,
              overflow: "hidden",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (node.url) window.open(node.url, "_blank", "noopener,noreferrer")
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
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
                fontSize: 9 * scale, color: "#B07A3A",
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
              // eslint-disable-next-line @next/next/no-img-element
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
            onBlur={handleTextareaBlur}
            onKeyDown={handleTextareaKeyDown}
            style={{
              flex: 1, width: "100%", resize: "none",
              fontSize: 11 * scale, lineHeight: 1.5,
              color: "var(--text-primary)",
              background: "transparent", border: "none", outline: "none",
              fontFamily: "var(--font-sans)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : node.node_type === "text" && !rawContent ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            justifyContent: "center",
            fontSize: 11 * scale, color: "var(--text-tertiary)",
            fontStyle: "italic",
          }}>
            Escribe aqui...
          </div>
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

      {/* Project link badge — top-right corner, visible when not resizing */}
      {node.node_type === "note" && node.note?.project_id && !node.locked && (
        <div
          title="Vinculada a proyecto"
          style={{
            position: "absolute",
            top: 4 * scale,
            right: 4 * scale,
            width: 8 * scale,
            height: 8 * scale,
            borderRadius: "50%",
            backgroundColor: "#C4704A",
            pointerEvents: "none",
            zIndex: 101,
          }}
        />
      )}

      {/* Resize handles — visible on hover or selected */}
      {renderResizeHandles(false)}

      {/* Connection handles */}
      {renderConnectionHandles()}
    </div>
  )
}
