"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { Plus, BookOpen, Layout, Waypoints } from "lucide-react"
import { Button } from "@/components/ui"
import { useNotesStore } from "@/stores/notes-store"
import { NotesToolbar } from "./NotesToolbar"
import { NotesList } from "./NotesList"
import { NoteModal } from "./NoteModal"
import { NotePane } from "./NotePane"
import { NotesSidebar } from "./NotesSidebar"
import { NotesCanvas } from "./canvas/NotesCanvas"
import type { Note } from "@/types/notes"

// d3 solo entra en el bundle cuando se abre la vista grafo
const NotesGraphView = dynamic(
  () => import("./graph/NotesGraphView").then((m) => m.NotesGraphView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-tertiary">Cargando grafo…</p>
      </div>
    ),
  }
)

interface Props {
  userId: string
}

export function NotesView({ userId }: Props) {
  // El store ya viene poblado por la megacarga (`AppDataLoader` →
  // `hydrateAllStores`) antes de que este componente monte.
  const initCanvas = useNotesStore((s) => s.initCanvas)
  const syncNotesToCanvas = useNotesStore((s) => s.syncNotesToCanvas)
  const addNoteToCanvas = useNotesStore((s) => s.addNoteToCanvas)
  const notes = useNotesStore((s) => s.notes)
  const viewMode = useNotesStore((s) => s.viewMode)
  const setViewMode = useNotesStore((s) => s.setViewMode)
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)

  // modalOpen/editingNote: used for "new note" + canvas edits (not list edits)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [pendingCanvasPos, setPendingCanvasPos] = useState<{ x: number; y: number } | null>(null)
  const prevNoteCount = useRef(notes.length)
  // Track whether canvas has been initialized this session — avoid re-fetching DB
  // on every mode switch, which would overwrite in-memory optimistic updates
  const canvasLoadedRef = useRef(false)

  // Query param handling — ?note=id opens NotePane; ?subscription=id filters by subscription
  const searchParams = useSearchParams()
  useEffect(() => {
    const noteId = searchParams.get('note')
    const subscriptionId = searchParams.get('subscription')
    if (noteId && notes.length > 0) {
      const found = notes.find((n) => n.id === noteId)
      if (found) setSelectedNoteId(noteId)
    }
    if (subscriptionId && notes.length > 0) {
      // Filter notes to show only those linked to this subscription
      // We do this by setting activeTag — but subscriptions use a different mechanism
      // So we open the first linked note directly if found
      const linked = notes.find((n) => n.subscription_id === subscriptionId && !n.deleted_at)
      if (linked) setSelectedNoteId(linked.id)
    }
  }, [notes, searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNew = useCallback(() => {
    setPendingCanvasPos(null)
    setModalOpen(true)
  }, [])

  const handleEdit = useCallback((note: Note) => {
    setSelectedNoteId(note.id)
  }, [setSelectedNoteId])

  // Canvas: edit a note by noteId — still uses NoteModal in canvas context
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
    // Use getState() to access the freshest store snapshot — avoids stale closure over notes[]
    const storeNotes = useNotesStore.getState().notes
    if (pendingCanvasPos && viewMode === "canvas" && storeNotes.length > prevNoteCount.current) {
      const latestNote = storeNotes[0]
      if (latestNote) {
        const { canvas } = useNotesStore.getState()
        if (!canvas) await initCanvas(userId)
        const node = await addNoteToCanvas(latestNote.id, pendingCanvasPos)
        if (!node) {
          const refreshedCanvas = useNotesStore.getState().canvas
          if (refreshedCanvas) await useNotesStore.getState().fetchCanvas(refreshedCanvas.id)
        }
      }
    }
    setModalOpen(false)
    setEditingNote(null)
    setPendingCanvasPos(null)
  }, [pendingCanvasPos, viewMode, addNoteToCanvas, initCanvas, userId])

  // Switch to graph view: la carga (o refresh barato de backlinks) la hace
  // el propio NotesGraphView al montar
  const handleSwitchToGraph = useCallback(() => {
    setViewMode("graph")
    setSelectedNoteId(null)
  }, [setViewMode, setSelectedNoteId])

  // Switch to canvas view: init once, luego re-sync por si hay notas nuevas
  const handleSwitchToCanvas = useCallback(() => {
    setViewMode("canvas")
    if (!canvasLoadedRef.current) {
      canvasLoadedRef.current = true
      initCanvas(userId).then(() => syncNotesToCanvas(userId))
    } else {
      // Re-sync para mostrar notas creadas desde vista lista
      syncNotesToCanvas(userId)
    }
  }, [setViewMode, initCanvas, syncNotesToCanvas, userId])

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
    <div className="absolute inset-0 flex">
      {/* Folder sidebar */}
      <NotesSidebar userId={userId} />

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-0 animate-fade-in-up flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-heading text-2xl text-foreground">Notas</h1>
              <p className="mt-1 text-sm text-text-tertiary">
                Organiza tus ideas y conecta conocimiento
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-sand p-0.5">
                <button
                  onClick={() => { setViewMode("list"); setSelectedNoteId(null) }}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "list" ? "bg-[var(--module-notas)] text-white shadow-sm" : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <BookOpen size={13} strokeWidth={1.75} />
                  Lista
                </button>
                <button
                  onClick={handleSwitchToCanvas}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "canvas" ? "bg-[var(--module-notas)] text-white shadow-sm" : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <Layout size={13} strokeWidth={1.75} />
                  Canvas
                </button>
                <button
                  onClick={handleSwitchToGraph}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "graph" ? "bg-[var(--module-notas)] text-white shadow-sm" : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <Waypoints size={13} strokeWidth={1.75} />
                  Grafo
                </button>
              </div>
              <Button variant="primary" size="sm" onClick={handleNew}>
                <Plus size={16} strokeWidth={1.75} />
                <span className="hidden sm:inline">Nueva nota</span>
              </Button>
            </div>
          </div>

          {/* Toolbar (list only) */}
          {viewMode === "list" && (
            <div className="mb-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
              <NotesToolbar userId={userId} />
            </div>
          )}
        </div>

        {/* Content */}
        {viewMode === "list" && (
          <div className="flex flex-1 min-h-0 overflow-hidden animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            {/* Note list */}
            <div className={`flex flex-col overflow-y-auto overflow-x-hidden px-6 transition-all duration-200 ${
              selectedNoteId ? "w-[360px] flex-shrink-0" : "flex-1"
            }`}>
              <NotesList
                userId={userId}
                onEdit={handleEdit}
                onNew={handleNew}
                selectedNoteId={selectedNoteId}
              />
            </div>

            {/* Note pane */}
            {selectedNoteId && (
              <div className="flex-1 min-w-0 border-l border-border overflow-hidden animate-fade-in">
                <NotePane
                  noteId={selectedNoteId}
                  userId={userId}
                  onClose={() => setSelectedNoteId(null)}
                  onOpenNote={(note) => setSelectedNoteId(note.id)}
                />
              </div>
            )}
          </div>
        )}

        {viewMode === "canvas" && (
          <div className="flex-1 min-h-0 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <NotesCanvas
              userId={userId}
              onEditNote={handleCanvasEditNote}
              onNewNote={handleCanvasNewNote}
            />
          </div>
        )}

        {viewMode === "graph" && (
          <div className="flex flex-1 min-h-0 flex-col animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <NotesGraphView userId={userId} onNewNote={handleNew} />
          </div>
        )}

        {/* Modal — only for creating new notes and canvas edits */}
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
