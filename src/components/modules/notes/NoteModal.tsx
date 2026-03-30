"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Trash2, Eye, Code } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { marked } from "marked"
import { Modal, Button } from "@/components/ui"
import { useNotesStore, useAllTags } from "@/stores/notes-store"
import { useToast } from "@/stores/ui-store"
import { NoteColorPicker } from "./NoteColorPicker"
import { TagInput } from "./TagInput"
import type { Note, NoteColor } from "@/types/notes"

// ─── Marked config ────────────────────────────
marked.use({ breaks: true, gfm: true })

function sanitizeHtml(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
}

// Common icons for notes
const NOTE_ICONS = [
  'FileText', 'BookOpen', 'Lightbulb', 'Star', 'Heart', 'Bookmark',
  'Zap', 'Code', 'Palette', 'Music', 'Camera', 'Globe',
  'Target', 'Flag', 'Coffee', 'Briefcase',
]

interface Props {
  open: boolean
  onClose: () => void
  userId: string
  note?: Note | null
}

export function NoteModal({ open, onClose, userId, note }: Props) {
  const addNote = useNotesStore((s) => s.addNote)
  const editNote = useNotesStore((s) => s.editNote)
  const removeNote = useNotesStore((s) => s.removeNote)
  const allTags = useAllTags()
  const toast = useToast()

  const isEdit = Boolean(note)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [color, setColor] = useState<NoteColor>("default")
  const [icon, setIcon] = useState("FileText")
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showIcons, setShowIcons] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const snapshotRef = useRef<{ title: string; content: string; color: NoteColor; icon: string; tags: string[] } | null>(null)

  // Populate form + capture snapshot (must set ref before auto-save effect can fire)
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setColor(note.color)
      setIcon(note.icon)
      setTags([...note.tags])
      snapshotRef.current = { title: note.title, content: note.content, color: note.color, icon: note.icon, tags: [...note.tags] }
    } else {
      setTitle("")
      setContent("")
      setColor("default")
      setIcon("FileText")
      setTags([])
      snapshotRef.current = null
    }
    setConfirmDelete(false)
    setShowIcons(false)
    setShowPreview(false)
  }, [note, open])

  // Auto-save for existing notes (debounce 800ms) — only when there are real changes
  useEffect(() => {
    if (!isEdit || !note || !open) return
    const snap = snapshotRef.current
    if (!snap) return
    const isDirty = (
      title !== snap.title ||
      content !== snap.content ||
      color !== snap.color ||
      icon !== snap.icon ||
      JSON.stringify(tags) !== JSON.stringify(snap.tags)
    )
    if (!isDirty) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      editNote(note.id, { title: title || 'Sin título', content, color, icon, tags })
    }, 800)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [title, content, color, icon, tags, isEdit, note, open, editNote])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(200, textareaRef.current.scrollHeight) + 'px'
    }
  }, [content])

  const handleSave = async () => {
    if (isEdit && note) {
      const snap = snapshotRef.current
      const isDirty = !snap || (
        (title || 'Sin título') !== snap.title ||
        content !== snap.content ||
        color !== snap.color ||
        icon !== snap.icon ||
        JSON.stringify(tags) !== JSON.stringify(snap.tags)
      )
      if (!isDirty) {
        toast.info('No hay cambios que guardar')
        onClose()
        return
      }
    }
    setSaving(true)
    try {
      if (isEdit && note) {
        await editNote(note.id, { title: title || 'Sin título', content, color, icon, tags })
      } else {
        await addNote(userId, { title: title || 'Sin título', content, color, icon, tags })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!note) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    await removeNote(note.id)
    setSaving(false)
    onClose()
  }

  const previewHtml = useMemo(
    () => sanitizeHtml(marked.parse(content) as string),
    [content],
  )

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  const SelectedIcon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[icon] ?? LucideIcons.FileText

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <div className="space-y-4">
        {/* Title row with icon */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowIcons(!showIcons)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-sand transition-colors flex-shrink-0"
          >
            <SelectedIcon size={18} strokeWidth={1.75} className="text-text-secondary" />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la nota"
            className="flex-1 font-heading text-xl text-foreground bg-transparent outline-none placeholder:text-text-tertiary"
            autoFocus
          />
        </div>

        {/* Icon picker (toggle) */}
        {showIcons && (
          <div className="grid grid-cols-8 gap-1.5 p-2 rounded-lg bg-sand/50">
            {NOTE_ICONS.map((iconName) => {
              const IC = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[iconName]
              if (!IC) return null
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => { setIcon(iconName); setShowIcons(false) }}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    icon === iconName ? 'bg-[#7a9b76] text-white' : 'hover:bg-sand text-text-secondary'
                  }`}
                >
                  <IC size={16} strokeWidth={1.75} />
                </button>
              )
            })}
          </div>
        )}

        {/* Color picker */}
        <NoteColorPicker value={color} onChange={setColor} />

        {/* Content editor / preview toggle */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 rounded-lg bg-sand/30 p-0.5 w-fit">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
                !showPreview ? 'text-foreground bg-sand' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Code size={12} strokeWidth={1.75} />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
                showPreview ? 'text-foreground bg-sand' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Eye size={12} strokeWidth={1.75} />
              Vista previa
            </button>
          </div>

          {showPreview ? (
            <div
              className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm text-foreground leading-relaxed min-h-[200px] overflow-y-auto [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_a]:text-[#7a9b76] [&_a]:underline [&_code]:bg-sand [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_pre]:bg-sand [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#7a9b76] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_p]:mb-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0"
              dangerouslySetInnerHTML={{ __html: previewHtml || '<span class="text-text-tertiary">Sin contenido</span>' }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe tu nota... (Markdown soportado)"
              className="w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-text-tertiary focus:border-[#7a9b76] focus:outline-none resize-none min-h-[200px]"
            />
          )}
        </div>

        {/* Tags */}
        <TagInput tags={tags} onChange={setTags} suggestions={allTags} />

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-text-tertiary">
              {wordCount} palabra{wordCount !== 1 ? 's' : ''}
            </span>
            {isEdit && (
              <Button variant="danger" size="sm" onClick={handleDelete} loading={saving && confirmDelete}>
                <Trash2 size={13} strokeWidth={1.75} />
                {confirmDelete ? 'Confirmar' : 'Eliminar'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={saving && !confirmDelete}>
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
