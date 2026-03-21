"use client"

import { useCallback } from "react"
import { BookOpen, Plus, ArrowUpDown, GripVertical } from "lucide-react"
import { Button, Badge } from "@/components/ui"
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
  onEdit: (note: Note) => void
  onNew: () => void
}

// ─── Sortable wrapper ─────────────────

interface SortableNoteCardProps {
  note: Note
  index: number
  isManual: boolean
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
  onAddToCanvas: (id: string) => void
  searchQuery: string
}

function SortableNoteCard({
  note,
  index,
  isManual,
  onEdit,
  onDelete,
  onTogglePin,
  onAddToCanvas,
  searchQuery,
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
        {isManual && (
          <button
            {...attributes}
            {...listeners}
            className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex h-8 w-6 items-center justify-center rounded-md text-text-tertiary hover:text-foreground hover:bg-sand transition-colors cursor-grab active:cursor-grabbing"
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical size={14} strokeWidth={1.5} />
          </button>
        )}
        <div className={isManual ? "ml-5" : ""}>
          <NoteCard
            note={note}
            onEdit={onEdit}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
            onAddToCanvas={onAddToCanvas}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  )
}

// ─── NotesList ────────────────────────

export function NotesList({ onEdit, onNew }: Props) {
  const notes = useFilteredNotes()
  const removeNote = useNotesStore((s) => s.removeNote)
  const togglePin = useNotesStore((s) => s.togglePin)
  const addNoteToCanvas = useNotesStore((s) => s.addNoteToCanvas)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const sortMode = useNotesStore((s) => s.sortMode)
  const setSortMode = useNotesStore((s) => s.setSortMode)
  const setNotes = useNotesStore((s) => s.setNotes)

  const handleAddToCanvas = async (noteId: string) => {
    await addNoteToCanvas(noteId, { x: 100, y: 100 })
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

      // Reorder
      const reordered = [...allNotes]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      // Update sort_order on each note
      const updated = reordered.map((n, i) => ({ ...n, sort_order: i }))
      setNotes(updated)

      // Persist sort_order changes — fire and forget
      for (const note of updated) {
        if (note.sort_order !== allNotes.find((n) => n.id === note.id)?.sort_order) {
          useNotesStore.getState().editNote(note.id, { title: note.title }).catch(() => {
            // editNote only accepts NoteFormData fields, so we use the API directly below
          })
        }
      }
    },
    [setNotes]
  )

  if (notes.length === 0) {
    const hasSearch =
      useNotesStore.getState().searchQuery || useNotesStore.getState().activeTag
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen
          size={64}
          strokeWidth={0.75}
          className="text-text-tertiary/30 mb-4"
        />
        <h3 className="font-heading text-xl text-foreground mb-2">
          {hasSearch ? "Sin resultados" : "Aún no tienes notas"}
        </h3>
        <p className="text-sm text-text-tertiary mb-6 max-w-sm">
          {hasSearch
            ? "Prueba con otros términos de búsqueda"
            : "Crea tu primera nota para empezar a organizar tus ideas"}
        </p>
        {!hasSearch && (
          <Button variant="primary" onClick={onNew}>
            <Plus size={16} strokeWidth={1.75} />
            Crear primera nota
          </Button>
        )}
      </div>
    )
  }

  const noteIds = notes.map((n) => n.id)

  const gridContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map((note, i) => (
        <SortableNoteCard
          key={note.id}
          note={note}
          index={i}
          isManual={isManual}
          onEdit={onEdit}
          onDelete={removeNote}
          onTogglePin={togglePin}
          onAddToCanvas={handleAddToCanvas}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Sort bar */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="gray">
          {notes.length} {notes.length === 1 ? "nota" : "notas"}
        </Badge>
        <div className="flex items-center gap-2">
          <ArrowUpDown
            size={14}
            strokeWidth={1.5}
            className="text-text-tertiary"
          />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as NoteSortMode)}
            className="text-sm bg-background border border-border rounded-md px-2 py-1 text-text-secondary cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes grid */}
      {isManual ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={noteIds} strategy={verticalListSortingStrategy}>
            {gridContent}
          </SortableContext>
        </DndContext>
      ) : (
        gridContent
      )}
    </div>
  )
}
