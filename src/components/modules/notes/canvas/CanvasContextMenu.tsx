"use client"

import { useEffect, useRef } from "react"
import { StickyNote, Type, Square, Pencil, Lock, Unlock, Trash2, Copy, CopyPlus, ClipboardPaste, Link, Image as ImageIcon } from "lucide-react"

interface Props {
  x: number
  y: number
  worldX: number
  worldY: number
  targetNodeId: string | null
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
  hasSelection: boolean
  hasClipboard: boolean
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
  hasSelection,
  hasClipboard,
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

  const canvasItems: MenuItem[] = [
    {
      label: "Nueva nota",
      icon: <StickyNote size={14} strokeWidth={1.75} />,
      onClick: () => { onNewNote(worldPos); onClose() },
    },
    {
      label: "Texto rapido",
      icon: <Type size={14} strokeWidth={1.75} />,
      onClick: () => { onNewTextNode(worldPos); onClose() },
    },
    {
      label: "URL rapido",
      icon: <Link size={14} strokeWidth={1.75} />,
      onClick: () => { onNewUrlNode(worldPos); onClose() },
    },
    {
      label: "Imagen",
      icon: <ImageIcon size={14} strokeWidth={1.75} />,
      onClick: () => { onNewImageNode(worldPos); onClose() },
    },
    {
      label: "Crear grupo",
      icon: <Square size={14} strokeWidth={1.75} />,
      onClick: () => { onNewGroup(worldPos); onClose() },
    },
  ]

  // Add paste option to canvas menu if clipboard has content
  if (hasClipboard) {
    canvasItems.push({
      label: "Pegar",
      icon: <ClipboardPaste size={14} strokeWidth={1.75} />,
      onClick: () => { onPaste(); onClose() },
    })
  }

  const nodeItems: MenuItem[] = targetNodeId
    ? [
        {
          label: "Editar",
          icon: <Pencil size={14} strokeWidth={1.75} />,
          onClick: () => { onEditNote(targetNodeId); onClose() },
        },
        {
          label: "Copiar",
          icon: <Copy size={14} strokeWidth={1.75} />,
          onClick: () => { onCopy(); onClose() },
        },
        {
          label: "Duplicar",
          icon: <CopyPlus size={14} strokeWidth={1.75} />,
          onClick: () => { onDuplicate(); onClose() },
        },
        {
          label: isNodeLocked ? "Desbloquear" : "Bloquear",
          icon: isNodeLocked
            ? <Unlock size={14} strokeWidth={1.75} />
            : <Lock size={14} strokeWidth={1.75} />,
          onClick: () => { onToggleLock(targetNodeId); onClose() },
        },
        {
          label: "Eliminar",
          icon: <Trash2 size={14} strokeWidth={1.75} />,
          onClick: () => { onDeleteNode(targetNodeId); onClose() },
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
