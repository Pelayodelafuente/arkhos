"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, BookOpen, Layout } from "lucide-react"
import { Button } from "@/components/ui"
import { useNotesStore } from "@/stores/notes-store"
import { NotesToolbar } from "./NotesToolbar"
import { NotesList } from "./NotesList"
import { NoteModal } from "./NoteModal"
import { NotesCanvas } from "./canvas/NotesCanvas"
import type { Note, NoteCanvas } from "@/types/notes"

interface Props {
  initialNotes: Note[]
  initialCanvas: NoteCanvas
  userId: string
}

export function NotesView({ initialNotes, initialCanvas, userId }: Props) {
  const setNotes = useNotesStore((s) => s.setNotes)
  const setCanvas = useNotesStore((s) => s.setCanvas)
  const initCanvas = useNotesStore((s) => s.initCanvas)
  const addNote = useNotesStore((s) => s.addNote)
  const addNoteToCanvas = useNotesStore((s) => s.addNoteToCanvas)
  const notes = useNotesStore((s) => s.notes)
  const viewMode = useNotesStore((s) => s.viewMode)
  const setViewMode = useNotesStore((s) => s.setViewMode)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [pendingCanvasPos, setPendingCanvasPos] = useState<{ x: number; y: number } | null>(null)

  // Hydrate store with server data
  useEffect(() => {
    setNotes(initialNotes)
    setCanvas(initialCanvas)
  }, [initialNotes, initialCanvas, setNotes, setCanvas])

  const handleNew = useCallback(() => {
    setEditingNote(null)
    setPendingCanvasPos(null)
    setModalOpen(true)
  }, [])

  const handleEdit = useCallback((note: Note) => {
    setEditingNote(note)
    setPendingCanvasPos(null)
    setModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    setEditingNote(null)
    setPendingCanvasPos(null)
  }, [])

  // Canvas: edit a note by noteId
  const handleCanvasEditNote = useCallback((noteId: string) => {
    const note = notes.find((n) => n.id === noteId)
    if (note) {
      setEditingNote(note)
      setPendingCanvasPos(null)
      setModalOpen(true)
    }
  }, [notes])

  // Canvas: create a new note at a specific canvas position
  const handleCanvasNewNote = useCallback((pos: { x: number; y: number }) => {
    setEditingNote(null)
    setPendingCanvasPos(pos)
    setModalOpen(true)
  }, [])

  // After modal saves a new note, add it to the canvas if it was created from the canvas
  const handleModalClose = useCallback(() => {
    setModalOpen(false)
    setEditingNote(null)
    setPendingCanvasPos(null)
  }, [])

  // We need to intercept the modal's onClose to check if a new note was created from canvas
  // The NoteModal handles saving internally via the store. We watch for new notes being added.
  const lastNoteCountRef = useCallback(() => {
    return notes.length
  }, [notes.length])

  // Track when modal closes to add newly created notes to canvas
  const handleModalCloseWithCanvasSync = useCallback(() => {
    if (pendingCanvasPos && viewMode === 'canvas') {
      // The note was just created by the modal — find the most recently added note
      // Since addNote prepends to the array, it will be at index 0
      const latestNote = notes[0]
      if (latestNote) {
        addNoteToCanvas(latestNote.id, pendingCanvasPos)
      }
    }
    setModalOpen(false)
    setEditingNote(null)
    setPendingCanvasPos(null)
  }, [pendingCanvasPos, viewMode, notes, addNoteToCanvas])

  // Keyboard shortcut: Ctrl+N = new note
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        handleNew()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNew])

  return (
    <div>
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl text-foreground">Notas</h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Organiza tus ideas y conecta conocimiento
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg bg-sand p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-foreground text-card shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <BookOpen size={13} strokeWidth={1.75} />
                Lista
              </button>
              <button
                onClick={() => { setViewMode('canvas'); initCanvas(userId) }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'canvas' ? 'bg-foreground text-card shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Layout size={13} strokeWidth={1.75} />
                Canvas
              </button>
            </div>
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Plus size={16} strokeWidth={1.75} />
              <span className="hidden sm:inline">Nueva nota</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar (list only) */}
      {viewMode === 'list' && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <NotesToolbar />
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <NotesList onEdit={handleEdit} onNew={handleNew} />
        </div>
      ) : (
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <NotesCanvas
            userId={userId}
            onEditNote={handleCanvasEditNote}
            onNewNote={handleCanvasNewNote}
          />
        </div>
      )}

      {/* Modal */}
      <NoteModal
        open={modalOpen}
        onClose={handleModalCloseWithCanvasSync}
        userId={userId}
        note={editingNote}
      />
    </div>
  )
}
