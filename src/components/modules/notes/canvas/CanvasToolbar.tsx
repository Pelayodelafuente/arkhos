"use client"

import { Minus, Plus, Maximize2, StickyNote } from "lucide-react"
import { useNotesStore } from "@/stores/notes-store"

interface Props {
  onNewNote: () => void
  onFitAll: () => void
}

export function CanvasToolbar({ onNewNote, onFitAll }: Props) {
  const viewport = useNotesStore((s) => s.viewport)
  const setViewport = useNotesStore((s) => s.setViewport)

  const zoomIn = () => setViewport({ scale: Math.min(viewport.scale * 1.2, 3) })
  const zoomOut = () => setViewport({ scale: Math.max(viewport.scale / 1.2, 0.1) })
  const resetZoom = () => setViewport({ scale: 1 })

  const zoomPercent = Math.round(viewport.scale * 100)

  return (
    <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-border bg-card/90 backdrop-blur-sm px-1.5 py-1 shadow-sm">
      <button onClick={zoomOut} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-sand hover:text-foreground transition-colors">
        <Minus size={14} strokeWidth={1.75} />
      </button>
      <button onClick={resetZoom} className="px-2 py-0.5 font-mono text-[11px] text-text-secondary hover:text-foreground transition-colors min-w-[44px] text-center">
        {zoomPercent}%
      </button>
      <button onClick={zoomIn} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-sand hover:text-foreground transition-colors">
        <Plus size={14} strokeWidth={1.75} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <button onClick={onFitAll} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-sand hover:text-foreground transition-colors" title="Encajar todo">
        <Maximize2 size={14} strokeWidth={1.75} />
      </button>
      <button onClick={onNewNote} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-sand hover:text-foreground transition-colors" title="Nueva nota">
        <StickyNote size={14} strokeWidth={1.75} />
      </button>
    </div>
  )
}
