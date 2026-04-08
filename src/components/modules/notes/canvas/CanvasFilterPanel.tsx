"use client"

import { useEffect, useRef } from "react"
import { FileText, Type, Link, Image as ImageIcon, X } from "lucide-react"
import { useNotesStore } from "@/stores/notes-store"
import { NOTE_COLOR_CONFIG } from "@/types/notes"
import type { NodeType, NoteColor } from "@/types/notes"

const NODE_TYPE_OPTIONS: { value: NodeType; label: string; icon: React.ReactNode }[] = [
  { value: 'note', label: 'Nota', icon: <FileText size={13} strokeWidth={1.75} /> },
  { value: 'text', label: 'Texto', icon: <Type size={13} strokeWidth={1.75} /> },
  { value: 'url', label: 'URL', icon: <Link size={13} strokeWidth={1.75} /> },
  { value: 'image', label: 'Imagen', icon: <ImageIcon size={13} strokeWidth={1.75} /> },
]

interface Props { onClose: () => void }

export function CanvasFilterPanel({ onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const canvasFilters = useNotesStore((s) => s.canvasFilters)
  const setCanvasFilters = useNotesStore((s) => s.setCanvasFilters)
  const clearCanvasFilters = useNotesStore((s) => s.clearCanvasFilters)

  const hasFilters = canvasFilters.types.length > 0 || canvasFilters.colors.length > 0

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && e.target instanceof Node && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('pointerdown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('pointerdown', handleClick)
    }
  }, [onClose])

  function toggleType(type: NodeType) {
    const types = canvasFilters.types.includes(type)
      ? canvasFilters.types.filter(t => t !== type)
      : [...canvasFilters.types, type]
    setCanvasFilters({ ...canvasFilters, types })
  }

  function toggleColor(color: NoteColor) {
    const colors = canvasFilters.colors.includes(color)
      ? canvasFilters.colors.filter(c => c !== color)
      : [...canvasFilters.colors, color]
    setCanvasFilters({ ...canvasFilters, colors })
  }

  return (
    <div
      ref={panelRef}
      className="absolute bottom-14 right-0 z-40 w-52 rounded-xl border border-border bg-card shadow-md p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text-primary">Filtros</span>
        {hasFilters && (
          <button
            onClick={clearCanvasFilters}
            className="text-[10px] text-accent hover:text-text-primary transition-colors flex items-center gap-1"
          >
            <X size={10} />Limpiar
          </button>
        )}
      </div>

      <div className="mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">Tipo</span>
        <div className="mt-1.5 flex flex-col gap-1">
          {NODE_TYPE_OPTIONS.map(opt => {
            const active = canvasFilters.types.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleType(opt.value)}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors ${active ? 'bg-sand text-foreground' : 'text-text-secondary hover:bg-sand hover:text-foreground'}`}
              >
                {opt.icon}
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">Color</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {NOTE_COLOR_CONFIG.map(cfg => {
            const active = canvasFilters.colors.includes(cfg.value)
            return (
              <button
                key={cfg.value}
                onClick={() => toggleColor(cfg.value)}
                className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${active ? 'scale-110' : ''}`}
                style={{ backgroundColor: cfg.border, borderColor: active ? '#C4704A' : 'transparent' }}
                title={cfg.label}
                aria-label={cfg.label}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
