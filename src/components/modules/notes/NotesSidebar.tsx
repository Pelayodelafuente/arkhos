"use client"

import { useState, useRef, useEffect } from "react"
import {
  FileText,
  Star,
  Inbox,
  Archive,
  Folder,
  Plus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Trash2,
  Check,
  X,
  CalendarDays,
} from "lucide-react"
import * as LucideIcons from "lucide-react"
import { useNotesStore } from "@/stores/notes-store"
import type { NoteFolder } from "@/types/notes"

interface Props {
  userId: string
}

// ─── Static nav items ─────────────────

const NAV_ITEMS = [
  { id: null as string | null, label: "Todas las notas", icon: FileText },
  { id: "favorites" as string | null, label: "Favoritas", icon: Star },
  { id: "no-folder" as string | null, label: "Sin carpeta", icon: Inbox },
  { id: "archived" as string | null, label: "Archivo", icon: Archive },
  { id: "trash" as string | null, label: "Papelera", icon: Trash2 },
]

// ─── Component ────────────────────────

export function NotesSidebar({ userId }: Props) {
  const folders = useNotesStore((s) => s.folders)
  const notes = useNotesStore((s) => s.notes)
  const trashedNotes = useNotesStore((s) => s.trashedNotes)
  const activeFolderId = useNotesStore((s) => s.activeFolderId)
  const setActiveFolderId = useNotesStore((s) => s.setActiveFolderId)
  const addFolder = useNotesStore((s) => s.addFolder)
  const editFolder = useNotesStore((s) => s.editFolder)
  const removeFolder = useNotesStore((s) => s.removeFolder)
  const fetchFolders = useNotesStore((s) => s.fetchFolders)
  const fetchTrashedNotes = useNotesStore((s) => s.fetchTrashedNotes)
  const addNote = useNotesStore((s) => s.addNote)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)

  const [collapsed, setCollapsed] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const newFolderInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Fetch folders + trashed notes on mount
  useEffect(() => {
    fetchFolders(userId)
    fetchTrashedNotes(userId)
  }, [userId, fetchFolders, fetchTrashedNotes])

  // Focus new folder input
  useEffect(() => {
    if (creatingFolder) newFolderInputRef.current?.focus()
  }, [creatingFolder])

  // Focus rename input
  useEffect(() => {
    if (renamingFolderId) renameInputRef.current?.focus()
  }, [renamingFolderId])

  // Note count helpers
  const countFor = (folderId: string | null): number => {
    if (folderId === null) return notes.filter((n) => !n.archived).length
    if (folderId === "favorites") return notes.filter((n) => n.favorited && !n.archived).length
    if (folderId === "no-folder") return notes.filter((n) => !n.folder_id && !n.archived).length
    if (folderId === "archived") return notes.filter((n) => n.archived).length
    if (folderId === "trash") return trashedNotes.length
    return notes.filter((n) => n.folder_id === folderId && !n.archived).length
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) { setCreatingFolder(false); return }
    await addFolder(userId, { name, icon: "Folder", color: "default" })
    setNewFolderName("")
    setCreatingFolder(false)
  }

  const handleRename = async (folder: NoteFolder) => {
    const name = renameValue.trim()
    if (name && name !== folder.name) {
      await editFolder(folder.id, { name })
    }
    setRenamingFolderId(null)
  }

  const handleDailyNote = async () => {
    const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    const existing = notes.find(n => n.title === today && !n.archived && !n.deleted_at)
    if (existing) {
      setSelectedNoteId(existing.id)
    } else {
      const note = await addNote(userId, { title: today, content: '', color: 'default', icon: 'CalendarDays', tags: [] })
      if (note) setSelectedNoteId(note.id)
    }
  }

  const handleDeleteFolder = async (id: string) => {
    setMenuOpenId(null)
    setMenuPos(null)
    await removeFolder(id)
  }

  const startRename = (folder: NoteFolder) => {
    setMenuOpenId(null)
    setMenuPos(null)
    setRenameValue(folder.name)
    setRenamingFolderId(folder.id)
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 border-r border-border bg-[#FAF7F2] w-10 py-3 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary hover:bg-sand transition-colors"
          title="Expandir barra lateral"
        >
          <PanelLeftOpen size={15} strokeWidth={1.75} />
        </button>
        <div className="mt-2 flex flex-col items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeFolderId === item.id
            return (
              <button
                key={String(item.id)}
                onClick={() => setActiveFolderId(item.id)}
                className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                  isActive
                    ? "bg-[#B07A3A]/10 text-[#B07A3A]"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-sand"
                }`}
                title={item.label}
              >
                <Icon size={14} strokeWidth={1.75} />
              </button>
            )
          })}
          <div className="my-1 border-t border-border w-6" />
          {folders.map((folder) => {
            const isActive = activeFolderId === folder.id
            const FolderIcon =
              (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[folder.icon] ??
              Folder
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFolderId(folder.id)}
                className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                  isActive
                    ? "bg-[#B07A3A]/10 text-[#B07A3A]"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-sand"
                }`}
                title={folder.name}
              >
                <FolderIcon size={14} strokeWidth={1.75} />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-[220px] flex-shrink-0 border-r border-border bg-[#FAF7F2] py-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
          Notas
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary hover:bg-sand transition-colors"
          title="Colapsar barra lateral"
        >
          <PanelLeftClose size={13} strokeWidth={1.75} />
        </button>
      </div>

      {/* Daily note shortcut */}
      <div className="px-2 mb-2">
        <button
          onClick={handleDailyNote}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[13px] text-text-secondary hover:bg-sand hover:text-text-secondary transition-colors"
        >
          <CalendarDays size={14} strokeWidth={1.75} className="flex-shrink-0 text-[#B07A3A]" />
          <span className="flex-1 text-left">Nota de hoy</span>
        </button>
      </div>

      {/* Static views */}
      <div className="px-2 space-y-0.5 mb-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeFolderId === item.id
          const count = countFor(item.id)
          return (
            <button
              key={String(item.id)}
              onClick={() => setActiveFolderId(item.id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                isActive
                  ? "bg-[#B07A3A]/10 text-[#B07A3A] font-medium"
                  : "text-text-secondary hover:bg-sand hover:text-text-secondary"
              }`}
            >
              <Icon size={14} strokeWidth={1.75} className="flex-shrink-0" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {count > 0 && (
                <span className="text-[11px] font-mono text-text-tertiary">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Folders section */}
      <div className="px-2">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Carpetas
          </span>
          <button
            onClick={() => { setCreatingFolder(true); setNewFolderName("") }}
            className="flex h-5 w-5 items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary hover:bg-sand transition-colors"
            title="Nueva carpeta"
          >
            <Plus size={12} strokeWidth={2} />
          </button>
        </div>

        {/* New folder input */}
        {creatingFolder && (
          <div className="flex items-center gap-1 px-1 mb-1">
            <input
              ref={newFolderInputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder()
                if (e.key === "Escape") setCreatingFolder(false)
              }}
              placeholder="Nombre de carpeta"
              className="flex-1 text-[13px] bg-card border border-border rounded-md px-2 py-1 text-foreground outline-none focus:ring-1 focus:ring-[#B07A3A]"
            />
            <button
              onClick={handleCreateFolder}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#B07A3A] hover:bg-[#B07A3A]/10 transition-colors"
            >
              <Check size={12} strokeWidth={2} />
            </button>
            <button
              onClick={() => setCreatingFolder(false)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-sand transition-colors"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Folder list */}
        <div className="space-y-0.5">
          {folders.length === 0 && !creatingFolder && (
            <p className="px-3 py-2 text-[12px] text-text-tertiary italic">
              Crea tu primera carpeta
            </p>
          )}
          {folders.map((folder) => {
            const isActive = activeFolderId === folder.id
            const count = countFor(folder.id)
            const FolderIcon =
              (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[folder.icon] ??
              Folder
            const isRenaming = renamingFolderId === folder.id
            return (
              <div
                key={folder.id}
                className={`group relative flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#B07A3A]/10 text-[#B07A3A] font-medium"
                    : "text-text-secondary hover:bg-sand"
                }`}
                onClick={() => !isRenaming && setActiveFolderId(folder.id)}
              >
                <FolderIcon size={14} strokeWidth={1.75} className="flex-shrink-0" />
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(folder)
                      if (e.key === "Escape") setRenamingFolderId(null)
                    }}
                    onBlur={() => handleRename(folder)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-[13px] bg-card border border-border rounded-md px-1.5 py-0.5 text-foreground outline-none focus:ring-1 focus:ring-[#B07A3A]"
                  />
                ) : (
                  <span className="flex-1 truncate">{folder.name}</span>
                )}
                {!isRenaming && (
                  <>
                    {count > 0 && (
                      <span className="text-[11px] font-mono text-text-tertiary group-hover:hidden">
                        {count}
                      </span>
                    )}
                    <div className="relative ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (menuOpenId === folder.id) {
                            setMenuOpenId(null)
                            setMenuPos(null)
                          } else {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                            setMenuOpenId(folder.id)
                          }
                        }}
                        className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary hover:bg-border/40 transition-colors"
                        title="Opciones"
                      >
                        <MoreHorizontal size={12} strokeWidth={1.75} />
                      </button>
                      {menuOpenId === folder.id && menuPos && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setMenuPos(null) }}
                          />
                          <div
                            className="fixed z-50 w-36 rounded-lg border border-border bg-card py-1 shadow-md"
                            style={{ top: menuPos.top, right: menuPos.right }}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(folder) }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-sand transition-colors"
                            >
                              <Pencil size={12} strokeWidth={1.75} />
                              Renombrar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={12} strokeWidth={1.75} />
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
