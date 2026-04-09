"use client"

import { createElement, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Pin, Star, MoreHorizontal, Pencil, Trash2, Layout, Square, CheckSquare, Copy, FolderInput, Folder, Inbox, RotateCcw, ArchiveRestore, FileText } from "lucide-react"
import { getLucideIconOrDefault } from "@/lib/utils/icons"
import type { Note } from "@/types/notes"
import { NOTE_STATUS_CONFIG } from "@/types/notes"
import { NOTE_COLORS } from "./NoteColorPicker"
import { useNotesStore } from "@/stores/notes-store"

interface Props {
  note: Note
  userId: string
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleFavorite?: (id: string) => void
  onAddToCanvas?: (id: string) => void
  onDuplicate?: (id: string) => void
  searchQuery?: string
  isSelected?: boolean
  isSelectionMode?: boolean
  onToggleSelect?: (id: string) => void
  isPaneActive?: boolean
}

// ─── Helpers ──────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractFirstImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/)
  return match ? match[1] : null
}

function getChecklistProgress(html: string): { total: number; checked: number } | null {
  const totalMatches = html.match(/<li[^>]*data-type="taskItem"[^>]*>/g)
  if (!totalMatches || totalMatches.length === 0) return null
  const checkedMatches = html.match(/<li[^>]*data-checked="true"[^>]*>/g)
  return { total: totalMatches.length, checked: checkedMatches?.length ?? 0 }
}

// ─── Component ────────────────────────

export function NoteCard({ note, userId: _userId, onEdit, onDelete, onTogglePin, onToggleFavorite, onAddToCanvas, onDuplicate, searchQuery, isSelected, isSelectionMode, onToggleSelect, isPaneActive }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [folderMenuOpen, setFolderMenuOpen] = useState(false)
  const colorConfig = NOTE_COLORS.find((c) => c.value === note.color) ?? NOTE_COLORS[0]
  const folders = useNotesStore((s) => s.folders)
  const moveNoteToFolder = useNotesStore((s) => s.moveNoteToFolder)
  const restoreFromTrash = useNotesStore((s) => s.restoreFromTrash)
  const permanentlyDelete = useNotesStore((s) => s.permanentlyDelete)
  const unarchiveNote = useNotesStore((s) => s.unarchiveNote)

  const isInTrash = Boolean(note.deleted_at)

  const preview = stripHtml(note.content)
  const firstImage = extractFirstImage(note.content)
  const checklistProgress = getChecklistProgress(note.content)
  const timeAgo = getRelativeTime(isInTrash && note.deleted_at ? note.deleted_at : note.updated_at)

  const handleMenuClose = () => { setMenuOpen(false); setMenuPos(null); setConfirmDelete(false); setFolderMenuOpen(false) }

  return (
    <div
      className="group relative rounded-xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(26,23,20,0.06)]"
      style={{
        backgroundColor: colorConfig.bg,
        borderColor: isPaneActive
          ? 'var(--module-notas)'
          : note.color === 'default'
            ? 'var(--border-stone)'
            : colorConfig.border.startsWith('#')
              ? colorConfig.border + '80'
              : colorConfig.border,
        boxShadow: isPaneActive ? '0 0 0 2px rgba(122,155,118,0.2)' : undefined,
      }}
      onClick={() => isSelectionMode ? onToggleSelect?.(note.id) : (!isInTrash && onEdit(note))}
    >
      {/* Image preview */}
      {firstImage && (
        <div className="w-full h-28 rounded-t-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={firstImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          {/* Selection checkbox */}
          {isSelectionMode && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleSelect?.(note.id) }}
              className="flex-shrink-0 mt-0.5 text-text-tertiary hover:text-accent transition-colors"
            >
              {isSelected
                ? <CheckSquare size={15} strokeWidth={1.75} className="text-accent" />
                : <Square size={15} strokeWidth={1.75} />}
            </button>
          )}
          {createElement(getLucideIconOrDefault(note.icon, FileText), { size: 16, strokeWidth: 1.75, className: "text-text-secondary mt-0.5 flex-shrink-0" })}
          <h3 className={`flex-1 font-heading text-[15px] leading-snug line-clamp-2 ${note.title ? 'text-foreground' : 'text-text-tertiary italic'}`}>
            {note.title
              ? (searchQuery ? highlightText(note.title, searchQuery) : note.title)
              : preview
                ? preview.slice(0, 60) + (preview.length > 60 ? '…' : '')
                : 'Nota vacía'}
          </h3>
          {!isInTrash && (
            <>
              {/* Favorite toggle */}
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id) }}
                  className={`flex-shrink-0 mt-0.5 rounded transition-colors ${
                    note.favorited
                      ? "text-amber-400"
                      : "text-text-tertiary/40 opacity-0 group-hover:opacity-100 hover:text-amber-400"
                  }`}
                  title={note.favorited ? "Quitar de favoritas" : "Añadir a favoritas"}
                >
                  <Star size={12} strokeWidth={2} className={note.favorited ? "fill-amber-400" : ""} />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTogglePin(note.id) }}
                className={`flex-shrink-0 mt-0.5 rounded transition-colors ${
                  note.is_pinned
                    ? "text-accent"
                    : "text-text-tertiary/40 opacity-0 group-hover:opacity-100 hover:text-text-tertiary"
                }`}
                title={note.is_pinned ? "Desfijar" : "Fijar"}
              >
                <Pin size={12} strokeWidth={2} className={note.is_pinned ? "fill-accent" : ""} />
              </button>
            </>
          )}
          {/* Menu button — portal renders outside card to avoid transform containing-block */}
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (menuOpen) {
                  handleMenuClose()
                } else {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                  setMenuOpen(true)
                }
              }}
              className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-sand hover:text-foreground transition-all"
            >
              <MoreHorizontal size={14} strokeWidth={1.75} />
            </button>
            {menuOpen && menuPos && createPortal(
              <>
                <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); handleMenuClose() }} />
                <div className="fixed z-[101] w-44 rounded-lg border border-border bg-card py-1 shadow-md" style={{ top: menuPos.top, right: menuPos.right }}>
                  {isInTrash ? (
                    <>
                      <MenuButton icon={<RotateCcw size={13} />} label="Restaurar" onClick={() => { handleMenuClose(); restoreFromTrash(note.id) }} />
                      <div className="my-1 border-t border-border" />
                      <MenuButton
                        icon={<Trash2 size={13} />}
                        label={confirmDelete ? "¿Confirmar?" : "Eliminar definitivo"}
                        onClick={() => {
                          if (!confirmDelete) { setConfirmDelete(true) }
                          else { handleMenuClose(); permanentlyDelete(note.id) }
                        }}
                        danger
                      />
                    </>
                  ) : (
                    <>
                      <MenuButton icon={<Pencil size={13} />} label="Editar" onClick={() => { handleMenuClose(); onEdit(note) }} />
                      <MenuButton icon={<Pin size={13} />} label={note.is_pinned ? "Desfijar" : "Fijar"} onClick={() => { handleMenuClose(); onTogglePin(note.id) }} />
                      {onDuplicate && (
                        <MenuButton icon={<Copy size={13} />} label="Duplicar" onClick={() => { handleMenuClose(); onDuplicate(note.id) }} />
                      )}
                      <div className="relative">
                        <MenuButton
                          icon={<FolderInput size={13} />}
                          label="Mover a..."
                          onClick={(e) => { e?.stopPropagation(); setFolderMenuOpen((v) => !v) }}
                        />
                        {folderMenuOpen && (
                          <div className="fixed z-[102] w-40 rounded-lg border border-border bg-card py-1 shadow-md" style={{ top: menuPos.top, right: menuPos.right + 180 }}>
                            <MenuButton
                              icon={<Inbox size={13} />}
                              label="Sin carpeta"
                              onClick={() => { handleMenuClose(); moveNoteToFolder(note.id, null) }}
                              active={!note.folder_id}
                            />
                            {folders.map((f) => (
                              <MenuButton
                                key={f.id}
                                icon={<Folder size={13} />}
                                label={f.name}
                                onClick={() => { handleMenuClose(); moveNoteToFolder(note.id, f.id) }}
                                active={note.folder_id === f.id}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {note.archived && (
                        <MenuButton icon={<ArchiveRestore size={13} />} label="Desarchivar" onClick={() => { handleMenuClose(); unarchiveNote(note.id) }} />
                      )}
                      {onAddToCanvas && !note.archived && (
                        <MenuButton icon={<Layout size={13} />} label="Añadir al canvas" onClick={() => { handleMenuClose(); onAddToCanvas(note.id) }} />
                      )}
                      <div className="my-1 border-t border-border" />
                      <MenuButton
                        icon={<Trash2 size={13} />}
                        label={confirmDelete ? "¿Confirmar?" : "Mover a papelera"}
                        onClick={() => {
                          if (!confirmDelete) { setConfirmDelete(true) }
                          else { handleMenuClose(); onDelete(note.id) }
                        }}
                        danger
                      />
                    </>
                  )}
                </div>
              </>,
              document.body
            )}
          </div>
        </div>

        {/* Content preview */}
        {preview && (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 mb-3">
            {searchQuery ? highlightText(preview, searchQuery) : preview}
          </p>
        )}

        {/* Checklist progress */}
        {checklistProgress && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1 rounded-full bg-foreground/8 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#B07A3A] transition-all"
                style={{ width: checklistProgress.total > 0 ? `${(checklistProgress.checked / checklistProgress.total) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-[10px] font-mono text-text-tertiary flex-shrink-0">
              {checklistProgress.checked}/{checklistProgress.total}
            </span>
          </div>
        )}

        {/* Status badge + tags + time */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-wrap gap-1 items-center">
            {note.status && note.status !== 'none' && (() => {
              const cfg = NOTE_STATUS_CONFIG[note.status]
              return (
                <span
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                >
                  {cfg.label}
                </span>
              )
            })()}
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-foreground/5 text-text-tertiary">
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] text-text-tertiary">+{note.tags.length - 3}</span>
            )}
          </div>
          <span className="text-[10px] font-mono text-text-tertiary whitespace-nowrap ml-auto">
            {isInTrash ? `Eliminada ${timeAgo}` : timeAgo}
          </span>
        </div>
      </div>
    </div>
  )
}

function MenuButton({ icon, label, onClick, danger, active }: { icon: ReactNode; label: string; onClick: (e?: React.MouseEvent) => void; danger?: boolean; active?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e) }}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : active
          ? 'text-[#B07A3A] bg-[#B07A3A]/8 hover:bg-[#B07A3A]/12'
          : 'text-text-secondary hover:bg-sand'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function highlightText(text: string, query: string): ReactNode {
  if (!query) return text
  try {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-accent/20 rounded-sm px-0.5">{part}</mark> : part
    )
  } catch {
    return text
  }
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
