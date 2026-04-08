"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, ExternalLink } from "lucide-react"
import { getNotesByProject } from "@/lib/supabase/notes"
import type { Note } from "@/types/notes"

interface NotesViewProps {
  projectId: string
  userId: string
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function NotesView({ projectId, userId }: NotesViewProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setLoading(true)
    getNotesByProject(userId, projectId)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }, [projectId, userId])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-sand animate-pulse" />
        ))}
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card">
          <FileText size={20} strokeWidth={1.5} className="text-text-tertiary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Sin notas vinculadas</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            Abre una nota y usa la sección &quot;Vincular&quot; para asociarla a este proyecto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/notas')}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-sand transition-colors"
        >
          <ExternalLink size={12} strokeWidth={1.75} />
          Ir a Notas
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-text-tertiary">
          {notes.length} nota{notes.length !== 1 ? 's' : ''} vinculada{notes.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => router.push('/notas')}
          className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-foreground transition-colors"
        >
          <ExternalLink size={11} strokeWidth={1.75} />
          Ver todas
        </button>
      </div>

      {notes.map((note) => (
        <button
          key={note.id}
          type="button"
          onClick={() => router.push(`/notas?note=${note.id}`)}
          className="w-full flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left hover:bg-sand/50 transition-colors group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background flex-shrink-0">
            <FileText size={14} strokeWidth={1.75} className="text-text-tertiary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">
              {note.title || 'Sin título'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-text-tertiary">{getRelativeTime(note.updated_at)}</span>
              {note.tags && note.tags.length > 0 && (
                <span className="text-[11px] text-text-tertiary">
                  {note.tags.slice(0, 2).map((t) => `#${t}`).join(' ')}
                  {note.tags.length > 2 && ` +${note.tags.length - 2}`}
                </span>
              )}
              {note.word_count > 0 && (
                <span className="font-mono text-[11px] text-text-tertiary">
                  {note.word_count} pal.
                </span>
              )}
            </div>
          </div>
          <ExternalLink
            size={12}
            strokeWidth={1.75}
            className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
          />
        </button>
      ))}
    </div>
  )
}
