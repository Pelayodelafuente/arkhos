"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Trash2, Maximize2, Minimize2, Archive, ArchiveRestore, History, X, RotateCcw, Link2, ArrowRight, Unlink, FileText } from "lucide-react"
import { getLucideIcon, DynamicLucideIcon } from "@/lib/utils/icons"
import { Modal, Button } from "@/components/ui"
import { useNotesStore, useAllTags } from "@/stores/notes-store"
import { useToast } from "@/stores/ui-store"
import dynamic from "next/dynamic"
import { NoteColorPicker } from "./NoteColorPicker"
import { TagInput } from "./TagInput"

const NoteEditor = dynamic(() => import("./NoteEditor").then(m => ({ default: m.NoteEditor })), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-md bg-border/30" />,
})
import type { Note, NoteColor, NoteStatus, NoteVersion } from "@/types/notes"
import { NOTE_STATUS_CONFIG } from "@/types/notes"
import * as notesApi from "@/lib/supabase/notes"

const STATUS_OPTIONS: { value: NoteStatus; label: string }[] = [
  { value: 'none',        label: '—' },
  { value: 'idea',        label: 'Idea' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done',        label: 'Hecho' },
]

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
  onOpenNote?: (note: Note) => void
}

export function NoteModal({ open, onClose, userId, note, onOpenNote }: Props) {
  const addNote = useNotesStore((s) => s.addNote)
  const editNote = useNotesStore((s) => s.editNote)
  const removeNote = useNotesStore((s) => s.removeNote)
  const archiveNote = useNotesStore((s) => s.archiveNote)
  const unarchiveNote = useNotesStore((s) => s.unarchiveNote)
  const loadNoteLinks = useNotesStore((s) => s.loadNoteLinks)
  const loadNoteContent = useNotesStore((s) => s.loadNoteContent)
  const noteReferences = useNotesStore((s) => s.noteReferences)
  const noteBacklinks = useNotesStore((s) => s.noteBacklinks)
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
  const [isFullscreen, setIsFullscreen] = useState(false)

  // History panel
  const [historyOpen, setHistoryOpen] = useState(false)
  const [versions, setVersions] = useState<NoteVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null)

  const [status, setStatus] = useState<NoteStatus>('none')

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapshotRef = useRef<{ title: string; content: string; color: NoteColor; icon: string; tags: string[]; status: NoteStatus } | null>(null)
  const prevOpenRef = useRef(false)
  const contentEditedRef = useRef(false)

  // Lazy load content al abrir
  useEffect(() => {
    if (note?.id && open) {
      loadNoteContent(note.id)
    }
  }, [note?.id, open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Backlinks
  useEffect(() => {
    if (note?.id && open) {
      loadNoteLinks(note.id)
    }
  }, [note?.id, open, loadNoteLinks])

  const references = note?.id ? (noteReferences[note.id] ?? []) : []
  const backlinks = note?.id ? (noteBacklinks[note.id] ?? []) : []
  const hasLinks = references.length > 0 || backlinks.length > 0

  // Populate form + capture snapshot (must set ref before auto-save effect can fire)
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current
    prevOpenRef.current = open

    if (note && open) {
      if (justOpened) {
        // Full reset only on modal open — prevents loadNoteContent from overwriting user edits
        setTitle(note.title)
        setContent(note.content)
        setColor(note.color)
        setIcon(note.icon)
        setTags([...note.tags])
        setStatus(note.status ?? 'none')
        snapshotRef.current = { title: note.title, content: note.content, color: note.color, icon: note.icon, tags: [...note.tags], status: note.status ?? 'none' }
        contentEditedRef.current = false
        setConfirmDelete(false)
        setShowIcons(false)
        setHistoryOpen(false)
        setVersions([])
        setSelectedVersion(null)
      } else if (note.contentLoaded && !contentEditedRef.current) {
        // Content just loaded from server and user hasn't edited yet — update silently
        setContent(note.content)
        if (snapshotRef.current) {
          snapshotRef.current = { ...snapshotRef.current, content: note.content }
        }
      }
      // Auto-snapshot: save version if note was last edited >5 minutes ago (solo si content cargado)
      if (note.contentLoaded && justOpened) {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        if (new Date(note.updated_at).getTime() < fiveMinutesAgo) {
          notesApi.saveNoteVersion(note.id, userId, note.title, note.content).catch(() => {})
        }
      }
    } else if (!open) {
      setTitle("")
      setContent("")
      setColor("default")
      setIcon("FileText")
      setTags([])
      setStatus('none')
      snapshotRef.current = null
      contentEditedRef.current = false
      setConfirmDelete(false)
      setShowIcons(false)
      setHistoryOpen(false)
      setVersions([])
      setSelectedVersion(null)
    }
  }, [note, open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load versions when history panel opens
  const [prevHistorySync, setPrevHistorySync] = useState<{ historyOpen: boolean; note: Note | null | undefined }>({ historyOpen: false, note: null })
  if (historyOpen !== prevHistorySync.historyOpen || note !== prevHistorySync.note) {
    setPrevHistorySync({ historyOpen, note })
    if (historyOpen && note) setLoadingVersions(true)
  }

  useEffect(() => {
    if (historyOpen && note) {
      notesApi.getNoteVersions(note.id)
        .then(setVersions)
        .catch(() => toast.error('Error al cargar el historial'))
        .finally(() => setLoadingVersions(false))
    }
  }, [historyOpen, note]) // eslint-disable-line react-hooks/exhaustive-deps

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
      status !== snap.status ||
      JSON.stringify(tags) !== JSON.stringify(snap.tags)
    )
    if (!isDirty) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      editNote(note.id, { title: title || 'Sin título', content, color, icon, tags, status })
    }, 800)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [title, content, color, icon, tags, status, isEdit, note, open, editNote])

  const handleSave = async () => {
    if (isEdit && note) {
      const snap = snapshotRef.current
      const isDirty = !snap || (
        (title || 'Sin título') !== snap.title ||
        content !== snap.content ||
        color !== snap.color ||
        icon !== snap.icon ||
        status !== snap.status ||
        JSON.stringify(tags) !== JSON.stringify(snap.tags)
      )
      if (!isDirty) {
        toast.info('No hay cambios que guardar')
        onClose()
        return
      }
      // Save the PREVIOUS state as a version before overwriting
      if (snap) {
        notesApi.saveNoteVersion(note.id, userId, snap.title, snap.content).catch(() => {
          // Non-blocking: version save failure is not critical
        })
      }
    }
    setSaving(true)
    try {
      if (isEdit && note) {
        await editNote(note.id, { title: title || 'Sin título', content, color, icon, tags, status })
      } else {
        await addNote(userId, { title: title || 'Sin título', content, color, icon, tags, status })
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

  const handleArchive = async () => {
    if (!note) return
    if (note.archived) {
      await unarchiveNote(note.id)
    } else {
      await archiveNote(note.id)
      onClose()
    }
  }

  const handleRestoreVersion = (version: NoteVersion) => {
    setContent(version.content)
    if (version.title) setTitle(version.title)
    setHistoryOpen(false)
    toast.success(`Versión ${version.version_number} restaurada`)
  }

  const wordCount = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length

  // B4 — Related notes: share ≥1 tag (client-side, no extra DB call)
  const allNotes = useNotesStore((s) => s.notes)
  const relatedNotes = useMemo(() => {
    if (!note || tags.length === 0) return []
    return allNotes.filter((n) =>
      n.id !== note.id &&
      !n.deleted_at &&
      n.tags.some((t) => tags.includes(t))
    ).slice(0, 6)
  }, [allNotes, note, tags])

  // A9 — Unlinked mentions: notes whose content contains our title as text but not as [[title]]
  const unlinkedMentions = useMemo(() => {
    if (!note || !title.trim()) return []
    const t = title.trim().toLowerCase()
    const linked = `[[${title.trim().toLowerCase()}]]`
    return allNotes.filter((n) => {
      if (n.id === note.id || n.deleted_at) return false
      const text = n.content.replace(/<[^>]*>/g, ' ').toLowerCase()
      return text.includes(t) && !text.includes(linked)
    }).slice(0, 6)
  }, [allNotes, note, title])


  const modalSizeClass = isFullscreen
    ? 'max-w-[95vw] w-[95vw] h-[95vh] !max-h-[95vh]'
    : 'max-w-2xl'

  return (
    <Modal open={open} onClose={onClose} className={modalSizeClass}>
      <div className={`flex flex-col gap-4 ${isFullscreen ? 'h-full overflow-y-auto' : ''} relative`}>
        {/* Title row with icon + history + fullscreen toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowIcons(!showIcons)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-sand transition-colors flex-shrink-0"
          >
            <DynamicLucideIcon name={icon} fallback={FileText} size={18} strokeWidth={1.75} className="text-text-secondary" />
          </button>
          <textarea
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`
            }}
            placeholder="Título de la nota"
            maxLength={200}
            rows={1}
            autoFocus={!isEdit}
            className="flex-1 font-heading text-xl text-foreground bg-transparent outline-none placeholder:text-text-tertiary resize-none overflow-hidden leading-tight"
            style={{ height: '32px' }}
          />
          {/* History button — edit mode only */}
          {isEdit && (
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors flex-shrink-0 ${
                historyOpen
                  ? "bg-sand text-text-secondary"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-sand/60"
              }`}
              title="Historial de versiones"
            >
              <History size={15} strokeWidth={1.75} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary hover:bg-sand/60 transition-colors flex-shrink-0"
            title={isFullscreen ? 'Reducir' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={15} strokeWidth={1.75} /> : <Maximize2 size={15} strokeWidth={1.75} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-foreground hover:bg-sand/60 transition-colors flex-shrink-0"
            title="Cerrar"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Icon picker (toggle) */}
        {showIcons && (
          <div className="grid grid-cols-8 gap-1.5 p-2 rounded-lg bg-sand/50">
            {NOTE_ICONS.map((iconName) => {
              const IC = getLucideIcon(iconName)
              if (!IC) return null
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => { setIcon(iconName); setShowIcons(false) }}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    icon === iconName ? 'bg-[#B07A3A] text-white' : 'hover:bg-sand text-text-secondary'
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

        {/* Separator between color and status */}
        <div className="h-px bg-border" />

        {/* Status selector */}
        <div className="flex items-center gap-1.5">
          {STATUS_OPTIONS.map((opt) => {
            const cfg = NOTE_STATUS_CONFIG[opt.value]
            const isActive = status === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                style={isActive && opt.value !== 'none' ? {
                  background: cfg.bg,
                  color: cfg.color,
                  borderColor: cfg.color,
                } : {}}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                  isActive
                    ? opt.value === 'none'
                      ? 'bg-sand border-border text-text-secondary'
                      : 'border'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary hover:bg-sand/60'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Tiptap editor */}
        <div className={`rounded-md border border-border bg-card px-3 py-2.5 ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`}>
          <NoteEditor
            content={content}
            onChange={(html) => { contentEditedRef.current = true; setContent(html) }}
            placeholder="Escribe aquí... usa / para insertar bloques"
            autoFocus={!isEdit}
          />
        </div>

        {/* Backlinks panel */}
        {note?.id && hasLinks && (
          <div style={{
            borderTop: '1px solid var(--border-stone)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {references.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                  Esta nota menciona ({references.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {references.map(ref => (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => onOpenNote?.(ref)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(122,155,118,0.1)',
                        border: '1px solid rgba(122,155,118,0.3)',
                        color: 'var(--module-notas)',
                        fontSize: 11, fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <ArrowRight size={10} strokeWidth={2} />
                      {ref.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {backlinks.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                  Mencionada en ({backlinks.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {backlinks.map(bl => (
                    <button
                      key={bl.id}
                      type="button"
                      onClick={() => onOpenNote?.(bl)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(122,155,118,0.06)',
                        border: '1px solid rgba(122,155,118,0.2)',
                        color: 'var(--text-secondary)',
                        fontSize: 11, fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <Link2 size={10} strokeWidth={2} />
                      {bl.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* B4 — Related notes */}
        {isEdit && relatedNotes.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-stone)', paddingTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              Notas relacionadas ({relatedNotes.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {relatedNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onOpenNote?.(n)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 6,
                    background: 'var(--bg-sand)',
                    border: '1px solid var(--border-stone)',
                    color: 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {n.title || 'Sin título'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* A9 — Unlinked mentions */}
        {isEdit && unlinkedMentions.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-stone)', paddingTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              Menciones no enlazadas ({unlinkedMentions.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {unlinkedMentions.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onOpenNote?.(n)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 6,
                    background: 'rgba(155,122,74,0.06)',
                    border: '1px solid rgba(155,122,74,0.2)',
                    color: 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  <Unlink size={10} strokeWidth={2} />
                  {n.title || 'Sin título'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <TagInput tags={tags} onChange={setTags} suggestions={allTags} />

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-2 border-t border-border">
          {/* Left: destructive actions */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEdit && (
              <>
                <Button variant="ghost" size="sm" onClick={handleArchive}>
                  {note?.archived
                    ? <ArchiveRestore size={13} strokeWidth={1.75} />
                    : <Archive size={13} strokeWidth={1.75} />}
                  <span className="hidden sm:inline">{note?.archived ? 'Desarchivar' : 'Archivar'}</span>
                </Button>
                <Button variant="danger" size="sm" onClick={handleDelete} loading={saving && confirmDelete}>
                  <Trash2 size={13} strokeWidth={1.75} />
                  {confirmDelete ? 'Confirmar' : 'Eliminar'}
                </Button>
              </>
            )}
            <span className="font-mono text-[10px] text-text-tertiary ml-auto">
              {wordCount} {wordCount !== 1 ? 'palabras' : 'palabra'}
            </span>
          </div>
          {/* Right: primary actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving && !confirmDelete}
              disabled={!isEdit && !title.trim() && !content.trim()}
            >
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>

        {/* History panel — slides from the right */}
        {historyOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-64 bg-card border-l border-border flex flex-col z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Historial</span>
              <button
                onClick={() => { setHistoryOpen(false); setSelectedVersion(null) }}
                className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary hover:bg-sand transition-colors"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingVersions ? (
                <div className="p-4 text-center text-sm text-text-tertiary">Cargando...</div>
              ) : versions.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-tertiary">
                  Sin versiones guardadas
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {versions.filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i).map((version) => (
                    <button
                      key={version.id}
                      onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        selectedVersion?.id === version.id
                          ? "bg-sand"
                          : "hover:bg-sand/50"
                      }`}
                    >
                      <div className="text-[13px] font-medium text-foreground">
                        Versión {version.version_number}
                      </div>
                      <div className="text-[11px] text-text-tertiary mt-0.5">
                        {getRelativeTime(version.created_at)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedVersion && (
              <div className="border-t border-border p-3 space-y-2">
                <div className="rounded-md border border-border bg-[#FAF7F2] p-2.5 max-h-32 overflow-y-auto">
                  <p className="text-[12px] font-medium text-foreground mb-1">
                    {selectedVersion.title || 'Sin título'}
                  </p>
                  <div
                    className="text-[11px] text-text-secondary leading-relaxed line-clamp-4 tiptap-content"
                    dangerouslySetInnerHTML={{
                      __html: selectedVersion.content.replace(/<[^>]*>/g, ' ').trim().slice(0, 200),
                    }}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRestoreVersion(selectedVersion)}
                  className="w-full"
                >
                  <RotateCcw size={13} strokeWidth={1.75} />
                  Restaurar versión {selectedVersion.version_number}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
