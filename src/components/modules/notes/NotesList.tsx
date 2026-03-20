"use client"

import { BookOpen, Plus, ArrowUpDown } from "lucide-react"
import { Button, Badge } from "@/components/ui"
import { useFilteredNotes, useNotesStore } from "@/stores/notes-store"
import type { NoteSortMode } from "@/stores/notes-store"
import { NoteCard } from "./NoteCard"
import type { Note } from "@/types/notes"

const SORT_OPTIONS: { value: NoteSortMode; label: string }[] = [
  { value: 'recent', label: 'Recientes' },
  { value: 'oldest', label: 'Más antiguas' },
  { value: 'az', label: 'Alfabético A-Z' },
  { value: 'za', label: 'Alfabético Z-A' },
  { value: 'manual', label: 'Manual' },
]

interface Props {
  onEdit: (note: Note) => void
  onNew: () => void
}

export function NotesList({ onEdit, onNew }: Props) {
  const notes = useFilteredNotes()
  const removeNote = useNotesStore((s) => s.removeNote)
  const togglePin = useNotesStore((s) => s.togglePin)
  const addNoteToCanvas = useNotesStore((s) => s.addNoteToCanvas)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const sortMode = useNotesStore((s) => s.sortMode)
  const setSortMode = useNotesStore((s) => s.setSortMode)

  const handleAddToCanvas = async (noteId: string) => {
    await addNoteToCanvas(noteId, { x: 100, y: 100 })
  }

  if (notes.length === 0) {
    const hasSearch = useNotesStore.getState().searchQuery || useNotesStore.getState().activeTag
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen size={64} strokeWidth={0.75} className="text-text-tertiary/30 mb-4" />
        <h3 className="font-heading text-xl text-foreground mb-2">
          {hasSearch ? 'Sin resultados' : 'Aún no tienes notas'}
        </h3>
        <p className="text-sm text-text-tertiary mb-6 max-w-sm">
          {hasSearch
            ? 'Prueba con otros términos de búsqueda'
            : 'Crea tu primera nota para empezar a organizar tus ideas'}
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

  return (
    <div className="space-y-4">
      {/* Sort bar */}
      <div className="flex items-center justify-between gap-3">
        <Badge variant="gray">{notes.length} {notes.length === 1 ? 'nota' : 'notas'}</Badge>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} strokeWidth={1.5} className="text-text-tertiary" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note, i) => (
          <div key={note.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}>
            <NoteCard
              note={note}
              onEdit={onEdit}
              onDelete={removeNote}
              onTogglePin={togglePin}
              onAddToCanvas={handleAddToCanvas}
              searchQuery={searchQuery}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
