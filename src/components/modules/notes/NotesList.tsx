"use client"

import { useCallback, useEffect, useRef } from "react"
import { BookOpen, Plus, ArrowUpDown, GripVertical, Pin, CheckSquare, Archive, Trash2, X } from "lucide-react"
import { Button, Badge, Skeleton } from "@/components/ui"
import { useFilteredNotes, useNotesStore } from "@/stores/notes-store"
import type { NoteSortMode } from "@/stores/notes-store"
import { NoteCard } from "./NoteCard"
import type { Note } from "@/types/notes"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const SORT_OPTIONS: { value: NoteSortMode; label: string }[] = [
  { value: "recent", label: "Recientes" },
  { value: "oldest", label: "Más antiguas" },
  { value: "az", label: "Título A-Z" },
  { value: "za", label: "Título Z-A" },
  { value: "color", label: "Por color" },
  { value: "tag", label: "Por etiqueta" },
  { value: "manual", label: "Manual (arrastrar)" },
]

interface Props {
  userId: string
  onEdit: (note: Note) => void
  onNew: () => void
  selectedNoteId?: string | null
}

// ─── Sortable wrapper ─────────────────

interface SortableNoteCardProps {
  note: Note
  index: number
  userId: string
  isManual: boolean
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleFavorite: (id: string) => void
  onAddToCanvas: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleSelect: (id: string) => void
  searchQuery: string
  isSelected: boolean
  isSelectionMode: boolean
  isPaneActive: boolean
}

function SortableNoteCard({
  note,
  index,
  userId,
  isManual,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleFavorite,
  onAddToCanvas,
  onDuplicate,
  onToggleSelect,
  searchQuery,
  isSelected,
  isSelectionMode,
  isPaneActive,
}: SortableNoteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id, disabled: !isManual })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    animationDelay: isManual ? undefined : `${Math.min(index * 40, 300)}ms`,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isManual ? "" : "animate-fade-in-up"}
    >
      <div className="relative">
        {isManual && !isSelectionMode && (
          <button
            {...attributes}
            {...listeners}
            className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex h-8 w-6 items-center justify-center rounded-md text-text-tertiary hover:text-foreground hover:bg-sand transition-colors cursor-grab active:cursor-grabbing"
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical size={14} strokeWidth={1.5} />
          </button>
        )}
        <div className={isManual && !isSelectionMode ? "ml-5" : ""}>
          <NoteCard
            note={note}
            userId={userId}
            onEdit={onEdit}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
            onToggleFavorite={onToggleFavorite}
            onAddToCanvas={onAddToCanvas}
            onDuplicate={onDuplicate}
            searchQuery={searchQuery}
            isSelected={isSelected}
            isSelectionMode={isSelectionMode}
            onToggleSelect={onToggleSelect}
            isPaneActive={isPaneActive}
          />
        </div>
      </div>
    </div>
  )
}

// ─── NotesList ────────────────────────

export function NotesList({ userId, onEdit, onNew, selectedNoteId }: Props) {
  const notes = useFilteredNotes()
  const hasMoreNotes = useNotesStore((s) => s.hasMoreNotes)
  const isLoadingMore = useNotesStore((s) => s.isLoadingMore)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const loadMoreNotes = useNotesStore((s) => s.loadMoreNotes)
  const activeFolderId = useNotesStore((s) => s.activeFolderId)
  const removeNote = useNotesStore((s) => s.removeNote)
  const duplicateNote = useNotesStore((s) => s.duplicateNote)
  const emptyTrash = useNotesStore((s) => s.emptyTrash)
  const togglePin = useNotesStore((s) => s.togglePin)
  const toggleFavorite = useNotesStore((s) => s.toggleFavorite)
  const addNoteToCanvas = useNotesStore((s) => s.addNoteToCanvas)
  const sortMode = useNotesStore((s) => s.sortMode)
  const setSortMode = useNotesStore((s) => s.setSortMode)
  const setNotes = useNotesStore((s) => s.setNotes)
  const isTrashView = activeFolderId === 'trash'

  const isSelectionMode = useNotesStore((s) => s.isSelectionMode)
  const setSelectionMode = useNotesStore((s) => s.setSelectionMode)
  const selectedNoteIds = useNotesStore((s) => s.selectedNoteIds)
  const toggleNoteSelection = useNotesStore((s) => s.toggleNoteSelection)
  const selectAllNotes = useNotesStore((s) => s.selectAllNotes)
  const clearSelection = useNotesStore((s) => s.clearSelection)
  const bulkArchive = useNotesStore((s) => s.bulkArchive)
  const bulkDelete = useNotesStore((s) => s.bulkDelete)

  // Infinite scroll sentinel
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!bottomRef.current || searchQuery || activeFolderId === 'trash') return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreNotes(userId) },
      { threshold: 0.1 }
    )
    obs.observe(bottomRef.current)
    return () => obs.disconnect()
  }, [loadMoreNotes, userId, searchQuery, activeFolderId])

  const handleAddToCanvas = async (noteId: string) => {
    await addNoteToCanvas(noteId, { x: 100, y: 100 })
  }

  const handleDuplicate = async (noteId: string) => {
    await duplicateNote(noteId, userId)
  }

  const isManual = sortMode === "manual"

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const allNotes = useNotesStore.getState().notes
      const oldIndex = allNotes.findIndex((n) => n.id === active.id)
      const newIndex = allNotes.findIndex((n) => n.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = [...allNotes]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      const updated = reordered.map((n, i) => ({ ...n, sort_order: i }))
      setNotes(updated)

      for (const note of updated) {
        if (note.sort_order !== allNotes.find((n) => n.id === note.id)?.sort_order) {
          useNotesStore.getState().editNote(note.id, { title: note.title }).catch(() => {})
        }
      }
    },
    [setNotes]
  )

  if (notes.length === 0) {
    const hasSearch =
      useNotesStore.getState().searchQuery || useNotesStore.getState().activeTag
    const isFavoritesView = activeFolderId === 'favorites'
    const isNoFolderView = activeFolderId === 'no-folder'
    const isArchivedView = activeFolderId === 'archived'
    const isSpecificFolder = activeFolderId && !['favorites', 'no-folder', 'archived', 'trash'].includes(activeFolderId)

    let heading = "Aún no tienes notas"
    let subtext = "Crea tu primera nota para empezar a organizar tus ideas"
    let showCreateBtn = true

    if (isTrashView) {
      heading = "Papelera vacía"
      subtext = "Las notas eliminadas aparecerán aquí"
      showCreateBtn = false
    } else if (hasSearch) {
      heading = "Sin resultados"
      subtext = "Prueba con otros términos de búsqueda"
      showCreateBtn = false
    } else if (isFavoritesView) {
      heading = "No tienes notas favoritas"
      subtext = "Marca notas con ★ para acceder rápidamente a tus favoritas"
      showCreateBtn = false
    } else if (isNoFolderView) {
      heading = "Todas tus notas están en carpetas"
      subtext = "Las notas sin carpeta aparecerán aquí"
      showCreateBtn = false
    } else if (isArchivedView) {
      heading = "No hay notas archivadas"
      subtext = "Las notas que archives aparecerán aquí"
      showCreateBtn = false
    } else if (isSpecificFolder) {
      heading = "Esta carpeta está vacía"
      subtext = "Mueve notas aquí o crea una nueva en esta carpeta"
      showCreateBtn = true
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen
          size={64}
          strokeWidth={0.75}
          className="text-text-tertiary/30 mb-4"
        />
        <h3 className="font-heading text-xl text-foreground mb-2">{heading}</h3>
        <p className="text-sm text-text-tertiary mb-6 max-w-sm">{subtext}</p>
        {showCreateBtn && (
          <Button variant="primary" onClick={onNew}>
            <Plus size={16} strokeWidth={1.75} />
            {isSpecificFolder ? "Crear nota aquí" : "Crear primera nota"}
          </Button>
        )}
        {isFavoritesView && (
          <Button variant="secondary" size="sm" onClick={() => useNotesStore.getState().setActiveFolderId(null)}>
            Ir a todas las notas
          </Button>
        )}
      </div>
    )
  }

  const pinnedNotes = notes.filter((n) => n.is_pinned)
  const regularNotes = notes.filter((n) => !n.is_pinned)

  const renderGrid = (list: Note[], indexOffset = 0) => (
    <div className={`grid gap-3 ${selectedNoteId ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
      {list.map((note, i) => (
        <SortableNoteCard
          key={note.id}
          note={note}
          userId={userId}
          index={indexOffset + i}
          isManual={isManual && !isTrashView}
          onEdit={onEdit}
          onDelete={removeNote}
          onTogglePin={togglePin}
          onToggleFavorite={toggleFavorite}
          onAddToCanvas={!isTrashView ? handleAddToCanvas : () => {}}
          onDuplicate={!isTrashView ? handleDuplicate : () => {}}
          onToggleSelect={toggleNoteSelection}
          searchQuery={searchQuery}
          isSelected={selectedNoteIds.has(note.id)}
          isSelectionMode={isSelectionMode}
          isPaneActive={note.id === selectedNoteId}
        />
      ))}
    </div>
  )

  const allIds = notes.map((n) => n.id)

  const content = (
    <div className="space-y-5">
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Pin size={12} strokeWidth={2} className="text-accent fill-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              Fijadas
            </span>
          </div>
          {renderGrid(pinnedNotes, 0)}
          {regularNotes.length > 0 && (
            <div className="border-t border-border" />
          )}
        </div>
      )}

      {regularNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              Notas
            </span>
          )}
          {renderGrid(regularNotes, pinnedNotes.length)}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4 pb-6">
      {/* Sort bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gray">
            {notes.length} {notes.length === 1 ? "nota" : "notas"}
          </Badge>
          {isTrashView && notes.length > 0 && (
            <button
              onClick={emptyTrash}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              <Trash2 size={13} strokeWidth={1.75} />
              Vaciar papelera
            </button>
          )}
          {isSelectionMode && selectedNoteIds.size > 0 && (
            <span className="text-[12px] text-text-tertiary">
              {selectedNoteIds.size} seleccionada{selectedNoteIds.size !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Selection mode toggle */}
          <button
            onClick={() => isSelectionMode ? clearSelection() : setSelectionMode(true)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isSelectionMode
                ? "bg-[#7a9b76]/10 text-[#7a9b76]"
                : "text-text-tertiary hover:text-text-secondary hover:bg-sand"
            }`}
          >
            <CheckSquare size={13} strokeWidth={1.75} />
            {isSelectionMode ? "Cancelar" : "Seleccionar"}
          </button>
          {!isSelectionMode && (
            <>
              <ArrowUpDown size={14} strokeWidth={1.5} className="text-text-tertiary" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as NoteSortMode)}
                className="text-sm bg-background border border-border rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent min-w-[130px]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </>
          )}
          {isSelectionMode && (
            <button
              onClick={selectAllNotes}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Todo
            </button>
          )}
        </div>
      </div>

      {/* Notes grid */}
      {isManual && !isSelectionMode ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
            {content}
          </SortableContext>
        </DndContext>
      ) : (
        content
      )}

      {/* Infinite scroll: sentinel + loading skeletons */}
      {!searchQuery && !isTrashView && (
        <>
          {isLoadingMore && (
            <div className={`grid gap-3 ${selectedNoteId ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          )}
          {hasMoreNotes && !isLoadingMore && (
            <div ref={bottomRef} className="h-4" aria-hidden />
          )}
        </>
      )}

      {/* Floating bulk action bar */}
      {isSelectionMode && selectedNoteIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 shadow-lg">
          <span className="text-[12px] font-medium text-card mr-1">
            {selectedNoteIds.size} seleccionada{selectedNoteIds.size !== 1 ? "s" : ""}
          </span>
          <div className="w-px h-4 bg-card/20" />
          <button
            onClick={bulkArchive}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-card/80 hover:text-card hover:bg-card/10 transition-colors"
          >
            <Archive size={13} strokeWidth={1.75} />
            Archivar
          </button>
          <button
            onClick={bulkDelete}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-card/10 transition-colors"
          >
            <Trash2 size={13} strokeWidth={1.75} />
            Eliminar
          </button>
          <div className="w-px h-4 bg-card/20" />
          <button
            onClick={clearSelection}
            className="flex h-6 w-6 items-center justify-center rounded-md text-card/60 hover:text-card hover:bg-card/10 transition-colors"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
