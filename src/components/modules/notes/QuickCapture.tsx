"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { PenLine, X } from "lucide-react"
import { useNotesStore } from "@/stores/notes-store"

interface Props {
  userId: string
}

export function QuickCapture({ userId }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  const addNote = useNotesStore((s) => s.addNote)
  const addFolder = useNotesStore((s) => s.addFolder)
  const moveNoteToFolder = useNotesStore((s) => s.moveNoteToFolder)
  const fetchFolders = useNotesStore((s) => s.fetchFolders)

  const titleRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Focus title when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50)
      // Pre-load folders if not loaded yet
      if (useNotesStore.getState().folders.length === 0) {
        fetchFolders(userId)
      }
    }
  }, [open, userId, fetchFolders])

  const handleClose = useCallback(() => {
    setOpen(false)
    setTitle("")
    setContent("")
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, handleClose])

  const handleSave = async () => {
    const t = title.trim()
    if (!t || saving) return
    setSaving(true)
    try {
      // Find or create Inbox folder
      let inboxId: string | null = null
      const existingInbox = useNotesStore.getState().folders.find(f => f.name === "Inbox")
      if (existingInbox) {
        inboxId = existingInbox.id
      } else {
        await addFolder(userId, { name: "Inbox", icon: "Inbox", color: "default" })
        inboxId = useNotesStore.getState().folders.find(f => f.name === "Inbox")?.id ?? null
      }

      const note = await addNote(userId, {
        title: t,
        content,
        color: "default",
        icon: "FileText",
        tags: [],
      })

      if (note && inboxId) {
        await moveNoteToFolder(note.id, inboxId)
      }

      handleClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50">
      {/* Popover card */}
      {open && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
          />
          <div
            ref={cardRef}
            className="absolute bottom-14 right-0 z-50 w-72 rounded-xl border border-border bg-card shadow-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-[13px] font-medium text-text-secondary">Captura rápida</span>
              <button
                onClick={handleClose}
                className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-sand hover:text-foreground transition-colors"
              >
                <X size={13} strokeWidth={1.75} />
              </button>
            </div>

            {/* Form */}
            <div className="px-4 py-3 space-y-2">
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSave() }}
                placeholder="Título de la nota"
                className="w-full text-[13px] bg-transparent text-foreground placeholder:text-text-tertiary outline-none border-b border-border pb-1.5 font-medium"
              />
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Contenido (opcional)"
                rows={4}
                className="w-full resize-none text-[13px] bg-transparent text-foreground placeholder:text-text-tertiary outline-none font-sans"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <span className="text-[11px] text-text-tertiary">→ carpeta Inbox</span>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="px-3 py-1 text-[12px] text-text-secondary hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim() || saving}
                  className="px-3 py-1 text-[12px] rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "var(--module-notas)", color: "white" }}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Captura rápida de nota"
        aria-label="Captura rápida de nota"
        className="flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: "var(--module-notas)", color: "white" }}
      >
        <PenLine size={18} strokeWidth={1.75} />
      </button>
    </div>
  )
}
