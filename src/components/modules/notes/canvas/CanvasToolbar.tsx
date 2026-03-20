"use client"

import { Minus, Plus, Maximize2, Grid3X3, StickyNote, Undo2, Redo2, Copy } from "lucide-react"
import { useNotesStore } from "@/stores/notes-store"

interface Props {
  onNewNote: () => void
  onFitAll: () => void
  snapEnabled: boolean
  onToggleSnap: () => void
  onUndo: () => void
  onRedo: () => void
  onDuplicate: () => void
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
}

export function CanvasToolbar({
  onNewNote, onFitAll, snapEnabled, onToggleSnap,
  onUndo, onRedo, onDuplicate, canUndo, canRedo, hasSelection,
}: Props) {
  const viewport = useNotesStore((s) => s.viewport)
  const setViewport = useNotesStore((s) => s.setViewport)

  const zoomIn = () => setViewport({ scale: Math.min(viewport.scale * 1.2, 3) })
  const zoomOut = () => setViewport({ scale: Math.max(viewport.scale / 1.2, 0.1) })
  const resetZoom = () => setViewport({ scale: 1 })

  const zoomPercent = Math.round(viewport.scale * 100)

  const btnBase =
    "flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-sand hover:text-foreground transition-colors"

  return (
    <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-border bg-card/90 backdrop-blur-sm px-1.5 py-1 shadow-sm">
      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`${btnBase} ${!canUndo ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Deshacer"
      >
        <Undo2 size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`${btnBase} ${!canRedo ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Rehacer"
      >
        <Redo2 size={14} strokeWidth={1.75} />
      </button>

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        disabled={!hasSelection}
        className={`${btnBase} ${!hasSelection ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Duplicar seleccion"
      >
        <Copy size={14} strokeWidth={1.75} />
      </button>

      <div className="mx-0.5 h-4 w-px bg-border" />

      {/* Zoom controls */}
      <button onClick={zoomOut} className={btnBase} title="Alejar">
        <Minus size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={resetZoom}
        className="px-2 py-0.5 font-mono text-[11px] text-text-secondary hover:text-foreground transition-colors min-w-[44px] text-center"
        title="Restablecer zoom"
      >
        {zoomPercent}%
      </button>
      <button onClick={zoomIn} className={btnBase} title="Acercar">
        <Plus size={14} strokeWidth={1.75} />
      </button>

      <div className="mx-0.5 h-4 w-px bg-border" />

      {/* Fit all */}
      <button onClick={onFitAll} className={btnBase} title="Encajar todo">
        <Maximize2 size={14} strokeWidth={1.75} />
      </button>

      {/* Snap toggle */}
      <button
        onClick={onToggleSnap}
        className={`${btnBase} ${snapEnabled ? "bg-sand text-foreground" : ""}`}
        title={snapEnabled ? "Desactivar snap" : "Activar snap"}
      >
        <Grid3X3 size={14} strokeWidth={1.75} />
      </button>

      <div className="mx-0.5 h-4 w-px bg-border" />

      {/* New note */}
      <button onClick={onNewNote} className={btnBase} title="Nueva nota">
        <StickyNote size={14} strokeWidth={1.75} />
      </button>
    </div>
  )
}
