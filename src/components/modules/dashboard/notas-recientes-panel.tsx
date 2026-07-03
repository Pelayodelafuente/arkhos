import Link from 'next/link'
import { DashboardPanel, PanelHeader, ModuleChip } from './dashboard-view'
import type { NoteData } from './dashboard-view'
import { relativeTime } from '@/lib/utils/format'

interface NotasRecientesProps {
  notes: NoteData[]
}

const NOTE_COLORS: Record<string, string> = {
  terracota: 'var(--accent-terracotta)',
  emerald:   'var(--color-gain)',
  blue:      'var(--module-gastos)',
  amber:     'var(--module-notas)',
  violet:    'var(--module-mercados)',
}

interface TipTapNode {
  type?: string
  text?: string
  content?: TipTapNode[]
}

function getPreview(content: string): string {
  try {
    const parsed = JSON.parse(content) as TipTapNode
    const texts: string[] = []
    function walk(node: TipTapNode) {
      if (node.text) texts.push(node.text)
      if (node.content) node.content.forEach(walk)
    }
    walk(parsed)
    return texts.join(' ').slice(0, 80)
  } catch {
    return content.replace(/<[^>]+>/g, '').slice(0, 80)
  }
}

export function NotasRecientesPanel({ notes }: NotasRecientesProps) {
  return (
    <DashboardPanel className="flex flex-col">
      <PanelHeader
        color="var(--module-notas)"
        title="Notas recientes"
        chip={<ModuleChip label="NOTAS" color="var(--module-notas)" />}
        right={
          <Link href="/notas" className="text-[10px] text-text-tertiary hover:text-foreground transition-colors">
            Ver todas →
          </Link>
        }
      />
      <div className="flex-1 divide-y divide-border/50">
        {notes.length === 0 ? (
          <div className="p-4 text-sm text-text-tertiary text-center">Sin notas recientes</div>
        ) : (
          notes.map((note) => {
            const dotColor = NOTE_COLORS[note.color ?? ''] ?? 'var(--module-notas)'
            const preview = getPreview(note.content)
            return (
              <Link
                key={note.id}
                href="/notas"
                className="flex gap-2.5 px-3.5 py-2.5 hover:bg-[color:var(--bg-card-hover)] transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: dotColor }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-foreground truncate">{note.title}</p>
                  {preview && (
                    <p className="text-[10px] text-text-tertiary truncate mt-0.5">{preview}</p>
                  )}
                  <p className="text-[9px] text-text-faint mt-1">{relativeTime(new Date(note.created_at))}</p>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </DashboardPanel>
  )
}
