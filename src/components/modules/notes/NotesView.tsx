"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Plus, BookOpen, Layout } from "lucide-react"
import { Button } from "@/components/ui"
import { useNotesStore } from "@/stores/notes-store"
import { NotesToolbar } from "./NotesToolbar"
import { NotesList } from "./NotesList"
import { NoteModal } from "./NoteModal"
import { NotesSidebar } from "./NotesSidebar"
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
  const addNoteToCanvas = useNotesStore((s) => s.addNoteToCanvas)
  const notes = useNotesStore((s) => s.notes)
  const viewMode = useNotesStore((s) => s.viewMode)
  const setViewMode = useNotesStore((s) => s.setViewMode)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [pendingCanvasPos, setPendingCanvasPos] = useState<{ x: number; y: number } | null>(null)
  const prevNoteCount = useRef(notes.length)

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
    prevNoteCount.current = notes.length
    setModalOpen(true)
  }, [notes.length])

  // After modal saves a new note from canvas, add it to canvas at the pending position
  const handleModalClose = useCallback(async () => {
    if (pendingCanvasPos && viewMode === "canvas" && notes.length > prevNoteCount.current) {
      // New note was added (prepended to array, at index 0)
      const latestNote = notes[0]
      if (latestNote) {
        // Ensure canvas is initialized before adding the note node
        const { canvas } = useNotesStore.getState()
        if (!canvas) {
          await initCanvas(userId)
        }
        const node = await addNoteToCanvas(latestNote.id, pendingCanvasPos)
        // If optimistic update didn't trigger, force a refresh
        if (!node) {
          const refreshedCanvas = useNotesStore.getState().canvas
          if (refreshedCanvas) {
            await useNotesStore.getState().fetchCanvas(refreshedCanvas.id)
          }
        }
      }
    }
    setModalOpen(false)
    setEditingNote(null)
    setPendingCanvasPos(null)
  }, [pendingCanvasPos, viewMode, notes, addNoteToCanvas, initCanvas, userId])

  // Switch to canvas view: init + sync
  const handleSwitchToCanvas = useCallback(() => {
    setViewMode("canvas")
    initCanvas(userId)
  }, [setViewMode, initCanvas, userId])

  // Keyboard shortcut: Ctrl+N = new note
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault()
        handleNew()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleNew])

  return (
    <div className="flex h-full -mx-6 -mt-6">
      {/* Folder sidebar */}
      <NotesSidebar userId={userId} />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto px-6 pt-6">
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
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "list" ? "bg-foreground text-card shadow-sm" : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                <BookOpen size={13} strokeWidth={1.75} />
                Lista
              </button>
              <button
                onClick={handleSwitchToCanvas}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "canvas" ? "bg-foreground text-card shadow-sm" : "text-text-tertiary hover:text-text-secondary"
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
      {viewMode === "list" && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <NotesToolbar />
        </div>
      )}

      {/* Content */}
      {viewMode === "list" ? (
        <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <NotesList onEdit={handleEdit} onNew={handleNew} />
        </div>
      ) : (
        <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
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
        onClose={handleModalClose}
        userId={userId}
        note={editingNote}
      />
      </div>
    </div>
  )
}
