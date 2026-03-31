"use client"

import { useEffect, useRef } from "react"
import {
  StickyNote,
  Type,
  Square,
  Pencil,
  Lock,
  Unlock,
  Trash2,
  Copy,
  CopyPlus,
  ClipboardPaste,
  Link,
  Image as ImageIcon,
  Tag,
  ArrowRight,
  Minus,
  ArrowLeftRight,
} from "lucide-react"
import type { EdgeColor, EdgeStyle } from "@/types/notes"

const EDGE_COLORS: { value: EdgeColor; color: string; label: string }[] = [
  { value: "default", color: "var(--text-faint)", label: "Neutro" },
  { value: "sage", color: "var(--module-notas)", label: "Sage" },
  { value: "terracotta", color: "#C4704A", label: "Terracotta" },
  { value: "stone", color: "#8A7A6A", label: "Stone" },
  { value: "blue", color: "#6B8CC4", label: "Blue" }, /* TODO: revisar #6B8CC4 */
]

interface Props {
  x: number
  y: number
  worldX: number
  worldY: number
  targetNodeId: string | null
  targetEdgeId: string | null
  onClose: () => void
  onNewNote: (pos: { x: number; y: number }) => void
  onNewTextNode: (pos: { x: number; y: number }) => void
  onNewUrlNode: (pos: { x: number; y: number }) => void
  onNewImageNode: (pos: { x: number; y: number }) => void
  onNewGroup: (pos: { x: number; y: number }) => void
  onDeleteNode: (id: string) => void
  onToggleLock: (id: string) => void
  onEditNote: (nodeId: string) => void
  isNodeLocked: boolean
  onCopy: () => void
  onPaste: () => void
  onDuplicate: () => void
  hasSelection?: boolean
  hasClipboard: boolean
  onEdgeColorChange: (edgeId: string, color: EdgeColor) => void
  onEdgeStyleChange: (edgeId: string, style: EdgeStyle) => void
  onEdgeEditLabel: (edgeId: string) => void
  onEdgeDelete: (edgeId: string) => void
}

interface MenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}

export function CanvasContextMenu({
  x,
  y,
  worldX,
  worldY,
  targetNodeId,
  targetEdgeId,
  onClose,
  onNewNote,
  onNewTextNode,
  onNewUrlNode,
  onNewImageNode,
  onNewGroup,
  onDeleteNode,
  onToggleLock,
  onEditNote,
  isNodeLocked,
  onCopy,
  onPaste,
  onDuplicate,
  hasClipboard,
  onEdgeColorChange,
  onEdgeStyleChange,
  onEdgeEditLabel,
  onEdgeDelete,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on Escape or click outside
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKey)
    document.addEventListener("pointerdown", handleClick)
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.removeEventListener("pointerdown", handleClick)
    }
  }, [onClose])

  const worldPos = { x: worldX, y: worldY }

  // ─── Edge context menu ────────────────
  if (targetEdgeId) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 w-48 rounded-lg border border-border bg-card py-1 shadow-md"
        style={{ left: x, top: y }}
      >
        {/* Edit label */}
        <button
          onClick={() => {
            onEdgeEditLabel(targetEdgeId)
            onClose()
          }}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-sand hover:text-foreground transition-colors"
        >
          <Tag size={14} strokeWidth={1.75} />
          Editar etiqueta
        </button>

        {/* Color submenu */}
        <div className="px-3 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            Color
          </span>
          <div className="mt-1.5 flex items-center gap-1.5">
            {EDGE_COLORS.map((ec) => (
              <button
                key={ec.value}
                onClick={() => {
                  onEdgeColorChange(targetEdgeId, ec.value)
                  onClose()
                }}
                className="h-[18px] w-[18px] rounded-full border border-border hover:scale-125 transition-transform"
                style={{ backgroundColor: ec.color }}
                title={ec.label}
                aria-label={`Color ${ec.label}`}
              />
            ))}
          </div>
        </div>

        {/* Style submenu */}
        <div className="px-3 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            Estilo
          </span>
          <div className="mt-1.5 flex items-center gap-1.5">
            <button
              onClick={() => { onEdgeStyleChange(targetEdgeId, 'arrow'); onClose() }}
              title="Flecha"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-sand hover:text-foreground transition-colors"
            >
              <ArrowRight size={14} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => { onEdgeStyleChange(targetEdgeId, 'line'); onClose() }}
              title="Línea"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-sand hover:text-foreground transition-colors"
            >
              <Minus size={14} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => { onEdgeStyleChange(targetEdgeId, 'bidirectional'); onClose() }}
              title="Bidireccional"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-sand hover:text-foreground transition-colors"
            >
              <ArrowLeftRight size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="my-1 border-t border-border" />

        {/* Delete */}
        <button
          onClick={() => {
            onEdgeDelete(targetEdgeId)
            onClose()
          }}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={14} strokeWidth={1.75} />
          Eliminar conexión
        </button>
      </div>
    )
  }

  // ─── Canvas context menu ──────────────
  const canvasItems: MenuItem[] = [
    {
      label: "Nueva nota",
      icon: <StickyNote size={14} strokeWidth={1.75} />,
      onClick: () => {
        onNewNote(worldPos)
        onClose()
      },
    },
    {
      label: "Texto rápido",
      icon: <Type size={14} strokeWidth={1.75} />,
      onClick: () => {
        onNewTextNode(worldPos)
        onClose()
      },
    },
    {
      label: "URL rápido",
      icon: <Link size={14} strokeWidth={1.75} />,
      onClick: () => {
        onNewUrlNode(worldPos)
        onClose()
      },
    },
    {
      label: "Imagen",
      icon: <ImageIcon size={14} strokeWidth={1.75} />,
      onClick: () => {
        onNewImageNode(worldPos)
        onClose()
      },
    },
    {
      label: "Crear grupo",
      icon: <Square size={14} strokeWidth={1.75} />,
      onClick: () => {
        onNewGroup(worldPos)
        onClose()
      },
    },
  ]

  // Add paste option to canvas menu if clipboard has content
  if (hasClipboard) {
    canvasItems.push({
      label: "Pegar",
      icon: <ClipboardPaste size={14} strokeWidth={1.75} />,
      onClick: () => {
        onPaste()
        onClose()
      },
    })
  }

  // ─── Node context menu ────────────────
  const nodeItems: MenuItem[] = targetNodeId
    ? [
        {
          label: "Editar",
          icon: <Pencil size={14} strokeWidth={1.75} />,
          onClick: () => {
            onEditNote(targetNodeId)
            onClose()
          },
        },
        {
          label: "Copiar",
          icon: <Copy size={14} strokeWidth={1.75} />,
          onClick: () => {
            onCopy()
            onClose()
          },
        },
        {
          label: "Duplicar",
          icon: <CopyPlus size={14} strokeWidth={1.75} />,
          onClick: () => {
            onDuplicate()
            onClose()
          },
        },
        {
          label: isNodeLocked ? "Desbloquear" : "Bloquear",
          icon: isNodeLocked ? (
            <Unlock size={14} strokeWidth={1.75} />
          ) : (
            <Lock size={14} strokeWidth={1.75} />
          ),
          onClick: () => {
            onToggleLock(targetNodeId)
            onClose()
          },
        },
        {
          label: "Eliminar",
          icon: <Trash2 size={14} strokeWidth={1.75} />,
          onClick: () => {
            onDeleteNode(targetNodeId)
            onClose()
          },
          danger: true,
        },
      ]
    : []

  const items = targetNodeId ? nodeItems : canvasItems
  const hasSeparator = targetNodeId !== null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-44 rounded-lg border border-border bg-card py-1 shadow-md"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <div key={item.label}>
          {hasSeparator && i === items.length - 1 && (
            <div className="my-1 border-t border-border" />
          )}
          <button
            onClick={item.onClick}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
              item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-text-secondary hover:bg-sand hover:text-foreground"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  )
}
