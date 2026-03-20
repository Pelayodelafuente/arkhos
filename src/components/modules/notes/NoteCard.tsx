"use client"

import { useState, type ReactNode } from "react"
import { Pin, MoreHorizontal, Pencil, Trash2, Layout } from "lucide-react"
import * as LucideIcons from "lucide-react"
import type { Note } from "@/types/notes"
import { NOTE_COLORS } from "./NoteColorPicker"

interface Props {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
  onAddToCanvas?: (id: string) => void
  searchQuery?: string
}

export function NoteCard({ note, onEdit, onDelete, onTogglePin, onAddToCanvas, searchQuery }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const colorConfig = NOTE_COLORS.find((c) => c.value === note.color) ?? NOTE_COLORS[0]

  // Get lucide icon component
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[note.icon] ?? LucideIcons.FileText

  // Content preview: strip markdown, truncate
  const preview = note.content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()

  // Relative time
  const timeAgo = getRelativeTime(note.updated_at)

  return (
    <div
      className="group relative rounded-xl border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(26,23,20,0.06)]"
      style={{
        backgroundColor: colorConfig.bg,
        borderColor: colorConfig.border + '40',
      }}
      onClick={() => onEdit(note)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <IconComponent size={16} strokeWidth={1.75} className="text-text-secondary mt-0.5 flex-shrink-0" />
          <h3 className="flex-1 font-heading text-[15px] text-foreground leading-snug line-clamp-2">
            {searchQuery ? highlightText(note.title, searchQuery) : note.title}
          </h3>
          {note.is_pinned && (
            <Pin size={12} strokeWidth={2} className="text-accent flex-shrink-0 mt-1 fill-accent" />
          )}
          {/* Menu button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-sand hover:text-foreground transition-all"
            >
              <MoreHorizontal size={14} strokeWidth={1.75} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
                <div className="absolute right-0 top-7 z-50 w-40 rounded-lg border border-border bg-card py-1 shadow-md">
                  <MenuButton icon={<Pencil size={13} />} label="Editar" onClick={() => { setMenuOpen(false); onEdit(note) }} />
                  <MenuButton icon={<Pin size={13} />} label={note.is_pinned ? "Desfijar" : "Fijar"} onClick={() => { setMenuOpen(false); onTogglePin(note.id) }} />
                  {onAddToCanvas && (
                    <MenuButton icon={<Layout size={13} />} label="Añadir al canvas" onClick={() => { setMenuOpen(false); onAddToCanvas(note.id) }} />
                  )}
                  <div className="my-1 border-t border-border" />
                  <MenuButton icon={<Trash2 size={13} />} label="Eliminar" onClick={() => { setMenuOpen(false); onDelete(note.id) }} danger />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content preview */}
        {preview && (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 mb-3">
            {searchQuery ? highlightText(preview, searchQuery) : preview}
          </p>
        )}

        {/* Tags + time */}
        <div className="flex items-end justify-between gap-2">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-foreground/5 text-text-tertiary">
                  {tag}
                </span>
              ))}
              {note.tags.length > 3 && (
                <span className="text-[10px] text-text-tertiary">+{note.tags.length - 3}</span>
              )}
            </div>
          )}
          <span className="text-[10px] font-mono text-text-tertiary whitespace-nowrap ml-auto">
            {timeAgo}
          </span>
        </div>
      </div>
    </div>
  )
}

function MenuButton({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-text-secondary hover:bg-sand'
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
