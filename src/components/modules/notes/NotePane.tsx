"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { X, Trash2, Archive, ArchiveRestore, History, RotateCcw, Link2, ArrowRight, Unlink, ChevronLeft, ChevronDown, FolderKanban, CreditCard, Star } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { Button, SelectCustom } from "@/components/ui"
import { useNotesStore, useAllTags } from "@/stores/notes-store"
import { useToast } from "@/stores/ui-store"
import { NoteColorPicker } from "./NoteColorPicker"
import { TagInput } from "./TagInput"
import { NoteEditor } from "./NoteEditor"
import type { Note, NoteColor, NoteStatus, NoteVersion } from "@/types/notes"
import { NOTE_STATUS_CONFIG } from "@/types/notes"
import * as notesApi from "@/lib/supabase/notes"
import { getProjectsForSelect, type ProjectSelectItem } from "@/lib/supabase/projects"
import { getSubscriptionsForSelect, type SubscriptionSelectItem } from "@/lib/supabase/expenses"
import { createClient } from "@/lib/supabase/client"
import { useIsMobile } from "@/hooks/useIsMobile"

const STATUS_OPTIONS: { value: NoteStatus; label: string }[] = [
  { value: 'none',        label: '—' },
  { value: 'idea',        label: 'Idea' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done',        label: 'Hecho' },
]

const NOTE_ICONS = [
  'FileText', 'BookOpen', 'Lightbulb', 'Star', 'Heart', 'Bookmark',
  'Zap', 'Code', 'Palette', 'Music', 'Camera', 'Globe',
  'Target', 'Flag', 'Coffee', 'Briefcase',
]

interface Props {
  noteId: string
  userId: string
  onClose: () => void
  onOpenNote?: (note: Note) => void
}

export function NotePane({ noteId, userId, onClose, onOpenNote }: Props) {
  const editNote = useNotesStore((s) => s.editNote)
  const removeNote = useNotesStore((s) => s.removeNote)
  const archiveNote = useNotesStore((s) => s.archiveNote)
  const unarchiveNote = useNotesStore((s) => s.unarchiveNote)
  const toggleFavorite = useNotesStore((s) => s.toggleFavorite)
  const loadNoteLinks = useNotesStore((s) => s.loadNoteLinks)
  const loadNoteContent = useNotesStore((s) => s.loadNoteContent)
  const noteReferences = useNotesStore((s) => s.noteReferences)
  const noteBacklinks = useNotesStore((s) => s.noteBacklinks)
  const allNotes = useNotesStore((s) => s.notes)
  const linkNoteToProject = useNotesStore((s) => s.linkNoteToProject)
  const linkNoteToSubscription = useNotesStore((s) => s.linkNoteToSubscription)
  const allTags = useAllTags()
  const toast = useToast()
  const isMobile = useIsMobile()

  const note = allNotes.find((n) => n.id === noteId) ?? null

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [color, setColor] = useState<NoteColor>("default")
  const [icon, setIcon] = useState("FileText")
  const [tags, setTags] = useState<string[]>([])
  const [status, setStatus] = useState<NoteStatus>('none')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showIcons, setShowIcons] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Cross-module links
  const [linkSectionOpen, setLinkSectionOpen] = useState(false)
  const [showRelatedNotes, setShowRelatedNotes] = useState(false)
  const [showUnlinkedMentions, setShowUnlinkedMentions] = useState(false)
  const [projects, setProjects] = useState<ProjectSelectItem[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionSelectItem[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)

  // Load projects + subscriptions when link section opens
  useEffect(() => {
    if (!linkSectionOpen || projects.length > 0 || subscriptions.length > 0) return
    setLoadingLinks(true)
    const client = createClient()
    Promise.all([
      getProjectsForSelect(client, userId),
      getSubscriptionsForSelect(userId),
    ])
      .then(([p, s]) => { setProjects(p); setSubscriptions(s) })
      .catch(() => toast.error('Error al cargar proyectos/suscripciones'))
      .finally(() => setLoadingLinks(false))
  }, [linkSectionOpen, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLinkProject = async (projectId: string | null) => {
    if (!note) return
    await linkNoteToProject(note.id, projectId)
  }

  const handleLinkSubscription = async (subscriptionId: string | null) => {
    if (!note) return
    await linkNoteToSubscription(note.id, subscriptionId)
  }

  // IA — sugerencia de tags
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([])
  const [suggestTagsLoading, setSuggestTagsLoading] = useState(false)

  // History panel
  const [historyOpen, setHistoryOpen] = useState(false)
  const [versions, setVersions] = useState<NoteVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null)

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapshotRef = useRef<{ title: string; content: string; color: NoteColor; icon: string; tags: string[]; status: NoteStatus } | null>(null)
  // Ref with latest pending-save data for the unmount flush (NAV-02)
  const pendingSaveRef = useRef<{ noteId: string; title: string; content: string; color: NoteColor; icon: string; tags: string[]; status: NoteStatus } | null>(null)

  // Lazy load content if not yet loaded
  useEffect(() => {
    if (noteId) loadNoteContent(noteId)
  }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load backlinks when note changes
  useEffect(() => {
    if (noteId) loadNoteLinks(noteId)
  }, [noteId, loadNoteLinks])

  // Populate form when note changes
  useEffect(() => {
    if (!note) { onClose(); return }
    // Cancel any pending save from the previous note
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null }
    pendingSaveRef.current = null
    setTitle(note.title)
    setContent(note.content)
    setColor(note.color)
    setIcon(note.icon)
    setTags([...note.tags])
    setStatus(note.status ?? 'none')
    snapshotRef.current = {
      title: note.title, content: note.content, color: note.color,
      icon: note.icon, tags: [...note.tags], status: note.status ?? 'none',
    }
    setConfirmDelete(false)
    setShowIcons(false)
    setHistoryOpen(false)
    setVersions([])
    setSelectedVersion(null)
    setSaveStatus('idle')
    setAiSuggestedTags([])
  }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cuando el content se carga de forma lazy, actualizar el editor
  useEffect(() => {
    if (!note?.contentLoaded) return
    setContent(note.content)
    if (snapshotRef.current) {
      snapshotRef.current = { ...snapshotRef.current, content: note.content }
    }
    // Auto-snapshot ahora que tenemos el content
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    if (new Date(note.updated_at).getTime() < fiveMinutesAgo) {
      notesApi.saveNoteVersion(note.id, userId, note.title, note.content).catch(() => {})
    }
  }, [note?.contentLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load versions when history panel opens
  useEffect(() => {
    if (historyOpen && note) {
      setLoadingVersions(true)
      notesApi.getNoteVersions(note.id)
        .then(setVersions)
        .catch(() => toast.error('Error al cargar el historial'))
        .finally(() => setLoadingVersions(false))
    }
  }, [historyOpen, note]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save (debounce 800ms)
  useEffect(() => {
    if (!note) return
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
    setSaveStatus('saving')
    // Track latest dirty data for flush on unmount
    pendingSaveRef.current = { noteId: note.id, title, content, color, icon, tags, status }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      editNote(note.id, { title: title || 'Sin título', content, color, icon, tags, status })
        .then(() => {
          setSaveStatus('saved')
          pendingSaveRef.current = null
          setTimeout(() => setSaveStatus('idle'), 2000)
        })
        .catch(() => setSaveStatus('idle'))
    }, 800)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [title, content, color, icon, tags, status, note, editNote])

  // NAV-02: flush pending save immediately on unmount (separate effect, empty deps)
  useEffect(() => {
    return () => {
      const pending = pendingSaveRef.current
      if (pending && autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
        useNotesStore.getState().editNote(pending.noteId, {
          title: pending.title || 'Sin título',
          content: pending.content,
          color: pending.color,
          icon: pending.icon,
          tags: pending.tags,
          status: pending.status,
        }).catch(() => {})
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !historyOpen) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, historyOpen])

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

  const references = noteId ? (noteReferences[noteId] ?? []) : []
  const backlinks = noteId ? (noteBacklinks[noteId] ?? []) : []
  const hasLinks = references.length > 0 || backlinks.length > 0

  const relatedNotes = useMemo(() => {
    if (!note || tags.length === 0) return []
    return allNotes.filter((n) =>
      n.id !== note.id && !n.deleted_at && n.tags.some((t) => tags.includes(t))
    ).slice(0, 6)
  }, [allNotes, note, tags])

  const unlinkedMentions = useMemo(() => {
    if (!note || !title.trim()) return []
    const t = title.trim().toLowerCase()
    const linked = `[[${t}]]`
    return allNotes.filter((n) => {
      if (n.id === note.id || n.deleted_at) return false
      const text = n.content.replace(/<[^>]*>/g, ' ').toLowerCase()
      return text.includes(t) && !text.includes(linked)
    }).slice(0, 6)
  }, [allNotes, note, title])

  const SelectedIcon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[icon] ?? LucideIcons.FileText

  // IA — Sugerir tags
  const handleSuggestTags = async () => {
    if (suggestTagsLoading) return
    setSuggestTagsLoading(true)
    setAiSuggestedTags([])
    try {
      const res = await fetch('/api/notes/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, existingTags: tags }),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        toast.error(err.error ?? 'Error al sugerir tags')
        return
      }
      const data = await res.json() as { tags?: string[] }
      setAiSuggestedTags(data.tags ?? [])
    } catch {
      toast.error('Error al conectar con la IA')
    } finally {
      setSuggestTagsLoading(false)
    }
  }

  const handleDismissAiTag = (tag: string) => {
    setAiSuggestedTags((prev) => prev.filter((t) => t !== tag))
  }

  if (!note) return null

  const panelContent = (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-text-tertiary hover:text-text-secondary transition-colors mr-1"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
            <span className="text-xs">Volver</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowIcons(!showIcons)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-sand transition-colors flex-shrink-0"
        >
          <SelectedIcon size={16} strokeWidth={1.75} className="text-text-secondary" />
        </button>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la nota"
            maxLength={200}
            className="flex-1 font-heading text-lg text-foreground bg-transparent outline-none placeholder:text-text-tertiary min-w-0"
          />
          {saveStatus !== 'idle' && (
            <span className={`text-[10px] font-mono flex-shrink-0 transition-opacity duration-500 ${saveStatus === 'saved' ? 'text-[#B07A3A]' : 'text-text-tertiary'}`}>
              {saveStatus === 'saving' ? 'Guardando…' : 'Guardado ✓'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => note && toggleFavorite(note.id)}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors flex-shrink-0 ${
            note?.favorited
              ? "text-amber-400"
              : "text-text-tertiary hover:text-amber-400 hover:bg-sand/60"
          }`}
          title={note?.favorited ? "Quitar de favoritas" : "Añadir a favoritas"}
        >
          <Star size={14} strokeWidth={1.75} className={note?.favorited ? "fill-amber-400" : ""} />
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors flex-shrink-0 ${
            historyOpen ? "bg-sand text-text-secondary" : "text-text-tertiary hover:text-text-secondary hover:bg-sand/60"
          }`}
          title="Historial de versiones"
        >
          <History size={14} strokeWidth={1.75} />
        </button>
        {!isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-text-secondary hover:bg-sand/60 transition-colors flex-shrink-0"
            title="Cerrar (Esc)"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {/* Icon picker */}
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
                    icon === iconName ? 'bg-[#B07A3A] text-white' : 'hover:bg-sand text-text-secondary'
                  }`}
                >
                  <IC size={15} strokeWidth={1.75} />
                </button>
              )
            })}
          </div>
        )}

        {/* Color picker */}
        <NoteColorPicker value={color} onChange={setColor} />

        {/* Separator */}
        <div className="h-px bg-border" />

        {/* Status */}
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((opt) => {
            const cfg = NOTE_STATUS_CONFIG[opt.value]
            const isActive = status === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                style={isActive && opt.value !== 'none' ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color } : {}}
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

        {/* Editor */}
        <div className="rounded-md border border-border bg-card px-3 py-2.5 min-h-[200px]">
          {note && !note.contentLoaded ? (
            <div className="space-y-2 py-1 animate-pulse">
              <div className="h-3 bg-border rounded-md w-3/4" />
              <div className="h-3 bg-border rounded-md w-full" />
              <div className="h-3 bg-border rounded-md w-5/6" />
              <div className="h-3 bg-border rounded-md w-2/3 mt-2" />
            </div>
          ) : (
            <NoteEditor
              content={content}
              onChange={setContent}
              placeholder="Escribe aquí... usa / para insertar bloques"
            />
          )}
        </div>

        {/* Backlinks */}
        {hasLinks && (
          <div className="border-t border-border pt-3 flex flex-col gap-2">
            {references.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1.5">
                  Esta nota menciona ({references.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {references.map(ref => (
                    <button
                      key={ref.id}
                      type="button"
                      onClick={() => onOpenNote?.(ref)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                      style={{ background: 'rgba(122,155,118,0.1)', border: '1px solid rgba(122,155,118,0.3)', color: 'var(--module-notas)' }}
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
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1.5">
                  Mencionada en ({backlinks.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {backlinks.map(bl => (
                    <button
                      key={bl.id}
                      type="button"
                      onClick={() => onOpenNote?.(bl)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                      style={{ background: 'rgba(122,155,118,0.06)', border: '1px solid rgba(122,155,118,0.2)', color: 'var(--text-secondary)' }}
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

        {/* Related notes — collapsible */}
        {relatedNotes.length > 0 && (
          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setShowRelatedNotes((v) => !v)}
              className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors mb-1.5"
            >
              <span>Notas relacionadas ({relatedNotes.length})</span>
              <ChevronDown
                size={11}
                strokeWidth={2}
                className={`transition-transform duration-200 ${showRelatedNotes ? '' : '-rotate-90'}`}
              />
            </button>
            {showRelatedNotes && (
              <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto">
                {relatedNotes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onOpenNote?.(n)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sand border border-border text-text-secondary hover:bg-sand/80 transition-colors"
                  >
                    {n.title || 'Sin título'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unlinked mentions — collapsible */}
        {unlinkedMentions.length > 0 && (
          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setShowUnlinkedMentions((v) => !v)}
              className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors mb-1.5"
            >
              <span>Menciones no enlazadas ({unlinkedMentions.length})</span>
              <ChevronDown
                size={11}
                strokeWidth={2}
                className={`transition-transform duration-200 ${showUnlinkedMentions ? '' : '-rotate-90'}`}
              />
            </button>
            {showUnlinkedMentions && (
              <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto">
                {unlinkedMentions.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onOpenNote?.(n)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                    style={{ background: 'rgba(155,122,74,0.06)', border: '1px solid rgba(155,122,74,0.2)', color: 'var(--text-secondary)' }}
                  >
                    <Unlink size={10} strokeWidth={2} />
                    {n.title || 'Sin título'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vincular — proyectos y suscripciones */}
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setLinkSectionOpen((v) => !v)}
            className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Link2 size={11} strokeWidth={2} />
              Vincular
              {(note?.project_id || note?.subscription_id) && (
                <span className="rounded-full bg-sand border border-border px-1.5 py-px text-[9px] font-medium text-text-secondary">
                  {[note?.project_id, note?.subscription_id].filter(Boolean).length}
                </span>
              )}
            </span>
            <ChevronDown
              size={11}
              strokeWidth={2}
              className={`transition-transform duration-200 ${linkSectionOpen ? '' : '-rotate-90'}`}
            />
          </button>

          {linkSectionOpen && (
            <div className="mt-2 space-y-2">
              {loadingLinks ? (
                <div className="text-xs text-text-tertiary py-1">Cargando...</div>
              ) : (
                <>
                  {/* Proyecto */}
                  <div className="flex items-center gap-2">
                    <FolderKanban size={13} strokeWidth={1.75} className="text-[#C4704A] flex-shrink-0" />
                    <span className="text-[11px] text-text-tertiary w-20 flex-shrink-0">Proyecto</span>
                    {note?.project_id ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-[11px] font-medium text-foreground truncate flex-1">
                          {projects.find((p) => p.id === note.project_id)?.name ?? '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleLinkProject(null)}
                          className="flex h-5 w-5 items-center justify-center rounded-md text-text-tertiary hover:text-foreground hover:bg-sand transition-colors flex-shrink-0"
                          title="Desvincular proyecto"
                        >
                          <X size={10} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <SelectCustom
                        value=""
                        onChange={(v) => { if (v) handleLinkProject(v) }}
                        options={[{ value: "", label: "Sin proyecto" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
                        placeholder="Sin proyecto"
                        className="flex-1 min-w-0"
                      />
                    )}
                  </div>

                  {/* Suscripción */}
                  <div className="flex items-center gap-2">
                    <CreditCard size={13} strokeWidth={1.75} className="text-[#4A7A9B] flex-shrink-0" />
                    <span className="text-[11px] text-text-tertiary w-20 flex-shrink-0">Suscripción</span>
                    {note?.subscription_id ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-[11px] font-medium text-foreground truncate flex-1">
                          {subscriptions.find((s) => s.id === note.subscription_id)?.name ?? '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleLinkSubscription(null)}
                          className="flex h-5 w-5 items-center justify-center rounded-md text-text-tertiary hover:text-foreground hover:bg-sand transition-colors flex-shrink-0"
                          title="Desvincular suscripción"
                        >
                          <X size={10} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <SelectCustom
                        value=""
                        onChange={(v) => { if (v) handleLinkSubscription(v) }}
                        options={[{ value: "", label: "Sin suscripción" }, ...subscriptions.map((s) => ({ value: s.id, label: s.name }))]}
                        placeholder="Sin suscripción"
                        className="flex-1 min-w-0"
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <TagInput
          tags={tags}
          onChange={setTags}
          suggestions={allTags}
          aiSuggestedTags={aiSuggestedTags}
          suggestLoading={suggestTagsLoading}
          onSuggestTags={handleSuggestTags}
          onDismissAiTag={handleDismissAiTag}
        />

        {/* Footer actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleArchive}>
            {note.archived
              ? <ArchiveRestore size={12} strokeWidth={1.75} />
              : <Archive size={12} strokeWidth={1.75} />}
            {note.archived ? 'Desarchivar' : 'Archivar'}
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} loading={saving && confirmDelete}>
            <Trash2 size={12} strokeWidth={1.75} />
            {confirmDelete ? 'Confirmar' : 'Eliminar'}
          </Button>
        </div>
      </div>

      {/* History panel */}
      {historyOpen && (
        <div className="absolute top-0 right-0 bottom-0 w-60 bg-card border-l border-border flex flex-col z-10">
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
              <div className="p-4 text-center text-sm text-text-tertiary">Sin versiones guardadas</div>
            ) : (
              <div className="divide-y divide-border">
                {versions.filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i).map((version) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                    className={`w-full text-left px-4 py-2.5 transition-colors ${
                      selectedVersion?.id === version.id ? "bg-sand" : "hover:bg-sand/50"
                    }`}
                  >
                    <div className="text-[13px] font-medium text-foreground">Versión {version.version_number}</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">{getRelativeTime(version.created_at)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedVersion && (
            <div className="border-t border-border p-3 space-y-2">
              <div className="rounded-md border border-border bg-[#FAF7F2] p-2.5 max-h-28 overflow-y-auto">
                <p className="text-[12px] font-medium text-foreground mb-1">{selectedVersion.title || 'Sin título'}</p>
                <div
                  className="text-[11px] text-text-secondary leading-relaxed line-clamp-3 tiptap-content"
                  dangerouslySetInnerHTML={{ __html: selectedVersion.content.replace(/<[^>]*>/g, ' ').trim().slice(0, 200) }}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => handleRestoreVersion(selectedVersion)} className="w-full">
                <RotateCcw size={12} strokeWidth={1.75} />
                Restaurar versión {selectedVersion.version_number}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // Mobile: full-screen overlay
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-card animate-slide-in-right">
        {panelContent}
      </div>
    )
  }

  return panelContent
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
