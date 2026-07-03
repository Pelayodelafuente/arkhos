"use client"

// ══════════════════════════════════════
// Arkhos — Grafo de Notas: vista contenedora
// Barra de controles (búsqueda, carpeta, huérfanas, contador, fullscreen),
// estados vacíos escalonados, GraphSvg y NotePane lateral al hacer click.
// ══════════════════════════════════════

import { useEffect, useMemo, useState, useCallback } from "react"
import { Search, Maximize2, Minimize2, CircleDashed, Plus, X } from "lucide-react"
import { Button, SelectCustom } from "@/components/ui"
import { useNotesStore } from "@/stores/notes-store"
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion"
import { NotePane } from "../NotePane"
import { GraphSvg } from "./GraphSvg"
import { buildGraph, buildNeighborMap } from "./graph-model"

interface Props {
  userId: string
  onNewNote: () => void
}

export function NotesGraphView({ userId, onNewNote }: Props) {
  const graphNotes = useNotesStore((s) => s.graphNotes)
  const graphBacklinks = useNotesStore((s) => s.graphBacklinks)
  const graphLoaded = useNotesStore((s) => s.graphLoaded)
  const isGraphLoading = useNotesStore((s) => s.isGraphLoading)
  const loadGraphData = useNotesStore((s) => s.loadGraphData)
  const ensureNoteInList = useNotesStore((s) => s.ensureNoteInList)
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)
  const folders = useNotesStore((s) => s.folders)

  const reducedMotion = usePrefersReducedMotion()

  const [searchQuery, setSearchQuery] = useState("")
  const [folderId, setFolderId] = useState<string | null>(null)
  const [showOrphans, setShowOrphans] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Carga inicial o refresh barato de backlinks al entrar a la vista
  useEffect(() => {
    void loadGraphData(userId)
  }, [loadGraphData, userId])

  const { nodes, links } = useMemo(
    () => buildGraph(graphNotes, graphBacklinks, folders, { folderId, showOrphans }),
    [graphNotes, graphBacklinks, folders, folderId, showOrphans]
  )
  const neighborMap = useMemo(() => buildNeighborMap(links), [links])

  const handleSelect = useCallback(
    (noteId: string) => {
      ensureNoteInList(noteId)
      setSelectedNoteId(noteId)
    },
    [ensureNoteInList, setSelectedNoteId]
  )

  // Esc: primero cierra el pane; después sale del fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      const currentSelected = useNotesStore.getState().selectedNoteId
      if (currentSelected) {
        useNotesStore.getState().setSelectedNoteId(null)
      } else {
        setIsFullscreen(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const clearFilters = () => {
    setSearchQuery("")
    setFolderId(null)
    setShowOrphans(true)
  }

  const folderOptions = [
    { value: "", label: "Todas las carpetas" },
    ...folders.map((f) => ({ value: f.id, label: f.name })),
  ]

  const isEmpty = graphLoaded && graphNotes.length === 0
  const noLinks = graphLoaded && graphNotes.length > 0 && links.length === 0
  const filteredOut = graphLoaded && graphNotes.length > 0 && nodes.length === 0

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[70] flex flex-col bg-background"
          : "flex flex-1 min-h-0 flex-col"
      }
    >
      {/* Barra de controles */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-border px-6 py-2.5">
        <div className="relative">
          <Search
            size={13}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en el grafo…"
            className="h-8 w-52 rounded-md border border-border bg-card pl-8 pr-7 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-text-tertiary hover:text-text-secondary"
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <SelectCustom
          value={folderId ?? ""}
          onChange={(v) => setFolderId(v === "" ? null : v)}
          options={folderOptions}
          placeholder="Todas las carpetas"
          buttonClassName="h-8 text-xs"
        />

        <button
          type="button"
          onClick={() => setShowOrphans((v) => !v)}
          title={showOrphans ? "Ocultar notas sin enlaces" : "Mostrar notas sin enlaces"}
          className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
            showOrphans
              ? "border-border bg-card text-text-secondary"
              : "border-accent bg-accent-hover-bg text-accent"
          }`}
        >
          <CircleDashed size={13} strokeWidth={1.75} />
          Huérfanas
        </button>

        <span className="ml-auto font-mono text-[11px] text-text-tertiary">
          {nodes.length} notas · {links.length} enlaces
        </span>

        <button
          type="button"
          onClick={() => setIsFullscreen((v) => !v)}
          aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          title={isFullscreen ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-text-tertiary transition-colors hover:text-text-secondary"
        >
          {isFullscreen ? (
            <Minimize2 size={13} strokeWidth={1.75} />
          ) : (
            <Maximize2 size={13} strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Área del grafo */}
      <div className="relative flex-1 min-h-0">
        {isGraphLoading && !graphLoaded && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-tertiary">Cargando grafo…</p>
          </div>
        )}

        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-text-tertiary">Aún no hay notas que conectar.</p>
            <Button variant="primary" size="sm" onClick={onNewNote}>
              <Plus size={16} strokeWidth={1.75} />
              Nueva nota
            </Button>
          </div>
        )}

        {filteredOut && !isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-text-tertiary">Ningún nodo coincide con los filtros.</p>
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}

        {graphLoaded && nodes.length > 0 && (
          <>
            <GraphSvg
              nodes={nodes}
              links={links}
              neighborMap={neighborMap}
              hoveredId={hoveredId}
              searchQuery={searchQuery}
              selectedId={selectedNoteId}
              reducedMotion={reducedMotion}
              onHover={setHoveredId}
              onSelect={handleSelect}
            />

            {noLinks && (
              <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-lg border border-border bg-card px-4 py-2 text-center">
                <p className="text-xs text-text-secondary">
                  Conecta tus notas escribiendo{" "}
                  <code className="font-mono text-accent">[[título de otra nota]]</code> en su
                  contenido.
                </p>
              </div>
            )}
          </>
        )}

        {/* Pane lateral de la nota clicada */}
        {selectedNoteId && (
          <div className="absolute bottom-0 right-0 top-0 w-full max-w-[440px] border-l border-border bg-card animate-fade-in">
            <NotePane
              noteId={selectedNoteId}
              userId={userId}
              onClose={() => setSelectedNoteId(null)}
              onOpenNote={(note) => handleSelect(note.id)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
