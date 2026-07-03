"use client"

import {
  Minus,
  Plus,
  Maximize2,
  StickyNote,
  Undo2,
  Redo2,
  Copy,
  Type,
  Link,
  Search,
  LayoutGrid,
  Share2,
  Download,
  Loader2,
  MoreHorizontal,
  Image as ImageIcon,
  Filter,
  Grid3X3,
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useNotesStore } from "@/stores/notes-store"

interface Props {
  onNewNote: () => void
  onAddTextNode: () => void
  onAddUrlNode: () => void
  onAddImageNode?: () => void
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
  onToggleFilters: () => void
  activeFilterCount: number
  onSyncBacklinks: () => void
  hasSyncableBacklinks: boolean
  onExportPng?: () => void
  isExporting?: boolean
}

export function CanvasToolbar({
  onNewNote,
  onAddTextNode,
  onAddUrlNode,
  onAddImageNode,
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
  onToggleFilters,
  activeFilterCount,
  onSyncBacklinks,
  hasSyncableBacklinks,
  onExportPng,
  isExporting = false,
}: Props) {
  const viewport = useNotesStore((s) => s.viewport)
  const setViewport = useNotesStore((s) => s.setViewport)
  const [showMore, setShowMore] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const zoomIn = () => setViewport({ scale: Math.min(viewport.scale * 1.2, 3) })
  const zoomOut = () => setViewport({ scale: Math.max(viewport.scale / 1.2, 0.1) })
  const resetZoom = () => setViewport({ scale: 1 })

  const zoomPercent = Math.round(viewport.scale * 100)

  const btnBase =
    "flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-sand hover:text-foreground transition-colors"
  const divider = <div className="mx-0.5 h-4 w-px bg-border" />

  // Close more menu on outside click
  useEffect(() => {
    if (!showMore) return
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showMore])

  return (
    <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-border bg-card/90 backdrop-blur-sm px-1.5 py-1 shadow-sm">

      {/* ── Grupo 1: Historial ── */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`${btnBase} ${!canUndo ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Deshacer (Ctrl+Z)"
        aria-label="Deshacer"
      >
        <Undo2 size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`${btnBase} ${!canRedo ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Rehacer (Ctrl+Shift+Z)"
        aria-label="Rehacer"
      >
        <Redo2 size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={onDuplicate}
        disabled={!hasSelection}
        className={`${btnBase} ${!hasSelection ? "opacity-30 cursor-not-allowed" : ""}`}
        title="Duplicar seleccion (Ctrl+D)"
        aria-label="Duplicar seleccion"
      >
        <Copy size={14} strokeWidth={1.75} />
      </button>

      {divider}

      {/* ── Grupo 2: Añadir contenido ── */}
      <button onClick={onNewNote} className={btnBase} title="Nueva nota" aria-label="Nueva nota">
        <StickyNote size={14} strokeWidth={1.75} />
      </button>
      <button onClick={onAddTextNode} className={btnBase} title="Nodo de texto" aria-label="Nodo de texto">
        <Type size={14} strokeWidth={1.75} />
      </button>
      <button onClick={() => onAddImageNode?.()} className={btnBase} title="Nodo de imagen" aria-label="Nodo de imagen">
        <ImageIcon size={14} strokeWidth={1.75} />
      </button>
      <button onClick={onAddUrlNode} className={btnBase} title="Nodo URL" aria-label="Nodo URL">
        <Link size={14} strokeWidth={1.75} />
      </button>

      {divider}

      {/* ── Grupo 3: Organizar ── */}
      <button
        onClick={onAutoLayout}
        className={btnBase}
        title="Auto-organizar nodos"
        aria-label="Auto-organizar nodos"
      >
        <LayoutGrid size={14} strokeWidth={1.75} />
      </button>
      <button onClick={onFitAll} className={btnBase} title="Encajar todo (Ctrl+Shift+0)" aria-label="Encajar todo">
        <Maximize2 size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={onSyncBacklinks}
        disabled={!hasSyncableBacklinks}
        className={`${btnBase} ${!hasSyncableBacklinks ? 'opacity-40 cursor-not-allowed' : ''}`}
        title="Sincronizar backlinks al canvas"
        aria-label="Sincronizar backlinks"
      >
        <Share2 size={14} strokeWidth={1.75} />
      </button>

      {divider}

      {/* ── Grupo 4: Vista / Zoom ── */}
      <button onClick={zoomOut} className={btnBase} title="Alejar (Ctrl+-)" aria-label="Alejar">
        <Minus size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={resetZoom}
        className="px-2 py-0.5 font-mono text-[11px] text-text-secondary hover:text-foreground transition-colors min-w-[44px] text-center"
        title="Restablecer zoom al 100%"
        aria-label="Restablecer zoom"
      >
        {zoomPercent}%
      </button>
      <button onClick={zoomIn} className={btnBase} title="Acercar (Ctrl+=)" aria-label="Acercar">
        <Plus size={14} strokeWidth={1.75} />
      </button>

      {divider}

      {/* ── Grupo 5: Buscar y filtrar ── */}
      <button
        onClick={onToggleSearch}
        className={btnBase}
        title="Buscar en canvas (Ctrl+F)"
        aria-label="Buscar en canvas"
      >
        <Search size={14} strokeWidth={1.75} />
      </button>
      <button
        onClick={onToggleFilters}
        className={`${btnBase} ${activeFilterCount > 0 ? "bg-sand text-foreground" : ""} relative`}
        title={activeFilterCount > 0 ? `Filtros activos (${activeFilterCount})` : "Filtros"}
        aria-label="Filtros"
      >
        <Filter size={14} strokeWidth={1.75} />
        {activeFilterCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: 'var(--accent-terracotta)', fontSize: 0,
          }} />
        )}
      </button>

      {divider}

      {/* ── Grupo 6: Mas opciones (···) ── */}
      <div ref={moreRef} className="relative">
        <button
          onClick={() => setShowMore(v => !v)}
          className={`${btnBase} ${showMore ? "bg-sand text-foreground" : ""}`}
          title="Mas opciones"
          aria-label="Mas opciones"
        >
          <MoreHorizontal size={14} strokeWidth={1.75} />
        </button>

        {showMore && (
          <div className="absolute bottom-9 right-0 z-50 min-w-[180px] rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-md py-1 flex flex-col">
            {/* Snap */}
            <button
              onClick={() => { onToggleSnap(); setShowMore(false) }}
              className={`flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${snapEnabled ? "text-foreground bg-sand" : "text-text-secondary hover:bg-sand hover:text-foreground"}`}
              title={snapEnabled ? "Desactivar snap a rejilla" : "Activar snap a rejilla"}
            >
              <Grid3X3 size={13} strokeWidth={1.75} />
              <span>{snapEnabled ? "Snap activado" : "Snap desactivado"}</span>
            </button>

            <div className="my-1 h-px bg-border mx-2" />

            {/* Exportar PNG */}
            <button
              onClick={() => { onExportPng?.(); setShowMore(false) }}
              disabled={!onExportPng || isExporting}
              className={`flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${!onExportPng || isExporting ? "opacity-40 cursor-not-allowed text-text-tertiary" : "text-text-secondary hover:bg-sand hover:text-foreground"}`}
              title="Exportar canvas como PNG"
            >
              {isExporting
                ? <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                : <Download size={13} strokeWidth={1.75} />
              }
              <span>{isExporting ? "Exportando..." : "Exportar PNG"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
