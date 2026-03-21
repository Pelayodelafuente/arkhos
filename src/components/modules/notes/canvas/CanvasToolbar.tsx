"use client"

import {
  Minus,
  Plus,
  Maximize2,
  Grid3X3,
  StickyNote,
  Undo2,
  Redo2,
  Copy,
  Type,
  SquareDashed,
  Link,
  Image as ImageIcon,
  Search,
  LayoutGrid,
  Layers,
} from "lucide-react"
import { useNotesStore } from "@/stores/notes-store"

interface Props {
  onNewNote: () => void
  onAddTextNode: () => void
  onAddUrlNode: () => void
  onAddImageNode?: () => void
  onAddGroupNode: () => void
  onFitAll: () => void
  snapEnabled: boolean
  onToggleSnap: () => void
  onUndo: () => void
  onRedo: () => void
  onDuplicate: () => void
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  onToggleSearch: () => void
  onAutoLayout: () => void
  onGroupSelection: () => void
  selectionCount: number
}

export function CanvasToolbar({
  onNewNote,
  onAddTextNode,
  onAddUrlNode,
  onAddImageNode,
  onAddGroupNode,
  onFitAll,
  snapEnabled,
  onToggleSnap,
  onUndo,
  onRedo,
  onDuplicate,
  canUndo,
  canRedo,
  hasSelection,
  onToggleSearch,
  onAutoLayout,
  onGroupSelection,
  selectionCount,
}: Props) {
  const viewport = useNotesStore((s) => s.viewport)
  const setViewport = useNotesStore((s) => s.setViewport)

  const zoomIn = () => setViewport({ scale: Math.min(viewport.scale * 1.2, 3) })
  const zoomOut = () => setViewport({ scale: Math.max(viewport.scale / 1.2, 0.1) })
  const resetZoom = () => setViewport({ scale: 1 })

  const zoomPercent = Math.round(viewport.scale * 100)

  const btnBase =
    "flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-sand hover:text-foreground transition-colors"

  const canGroup = selectionCount >= 2

  return (
    <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-border bg-card/90 backdrop-blur-sm px-1.5 py-1 shadow-sm">
      {/* Undo / Redo / Duplicate */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`${btnBase} ${!canUndo ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Deshacer"
        aria-label="Deshacer"
      >
        <Undo2 size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`${btnBase} ${!canRedo ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Rehacer"
        aria-label="Rehacer"
      >
        <Redo2 size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={onDuplicate}
        disabled={!hasSelection}
        className={`${btnBase} ${!hasSelection ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Duplicar selección"
        aria-label="Duplicar selección"
      >
        <Copy size={14} strokeWidth={1.75} />
      </button>

      <div className="mx-0.5 h-4 w-px bg-border" />

      {/* Search */}
      <button
        onClick={onToggleSearch}
        className={btnBase}
        title="Buscar en canvas"
        aria-label="Buscar en canvas"
      >
        <Search size={14} strokeWidth={1.75} />
      </button>

      <div className="mx-0.5 h-4 w-px bg-border" />

      {/* Zoom controls */}
      <button onClick={zoomOut} className={btnBase} title="Alejar" aria-label="Alejar">
        <Minus size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={resetZoom}
        className="px-2 py-0.5 font-mono text-[11px] text-text-secondary hover:text-foreground transition-colors min-w-[44px] text-center"
        title="Restablecer zoom"
        aria-label="Restablecer zoom"
      >
        {zoomPercent}%
      </button>
      <button onClick={zoomIn} className={btnBase} title="Acercar" aria-label="Acercar">
        <Plus size={14} strokeWidth={1.75} />
      </button>

      <div className="mx-0.5 h-4 w-px bg-border" />

      {/* Fit all */}
      <button onClick={onFitAll} className={btnBase} title="Encajar todo" aria-label="Encajar todo">
        <Maximize2 size={14} strokeWidth={1.75} />
      </button>

      {/* Snap toggle */}
      <button
        onClick={onToggleSnap}
        className={`${btnBase} ${snapEnabled ? "bg-sand text-foreground" : ""}`}
        title={snapEnabled ? "Desactivar snap" : "Activar snap"}
        aria-label={snapEnabled ? "Desactivar snap" : "Activar snap"}
      >
        <Grid3X3 size={14} strokeWidth={1.75} />
      </button>

      <div className="mx-0.5 h-4 w-px bg-border" />

      {/* New note */}
      <button onClick={onNewNote} className={btnBase} title="Nueva nota" aria-label="Nueva nota">
        <StickyNote size={14} strokeWidth={1.75} />
      </button>

      {/* Text node */}
      <button onClick={onAddTextNode} className={btnBase} title="Nodo de texto" aria-label="Nodo de texto">
        <Type size={14} strokeWidth={1.75} />
      </button>

      {/* URL node */}
      <button onClick={onAddUrlNode} className={btnBase} title="Nodo URL" aria-label="Nodo URL">
        <Link size={14} strokeWidth={1.75} />
      </button>

      {/* Image node */}
      <button onClick={onAddImageNode} className={btnBase} title="Nodo de imagen" aria-label="Nodo de imagen">
        <ImageIcon size={14} strokeWidth={1.75} />
      </button>

      {/* Group node */}
      <button onClick={onAddGroupNode} className={btnBase} title="Nodo de grupo" aria-label="Nodo de grupo">
        <SquareDashed size={14} strokeWidth={1.75} />
      </button>

      <div className="mx-0.5 h-4 w-px bg-border" />

      {/* Auto-layout */}
      <button
        onClick={onAutoLayout}
        className={btnBase}
        title="Auto-organizar nodos"
        aria-label="Auto-organizar nodos"
      >
        <LayoutGrid size={14} strokeWidth={1.75} />
      </button>

      {/* Group selection */}
      <button
        onClick={onGroupSelection}
        disabled={!canGroup}
        className={`${btnBase} ${!canGroup ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Agrupar selección"
        aria-label="Agrupar selección"
      >
        <Layers size={14} strokeWidth={1.75} />
      </button>
    </div>
  )
}
