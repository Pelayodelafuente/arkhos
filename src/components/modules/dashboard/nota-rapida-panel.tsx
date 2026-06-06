'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardPanel, PanelHeader } from './dashboard-view'

export function NotaRapidaPanel() {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!text.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const title = text.split('\n')[0]?.slice(0, 80) ?? 'Nota rápida'
    await supabase.from('notes').insert({
      user_id: user.id,
      title,
      content: text,
    })

    setText('')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <DashboardPanel className="flex flex-col">
      <PanelHeader color="var(--module-notas)" title="Nota rápida" />
      <div className="flex flex-col flex-1 p-3 gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe una nota rápida..."
          className="flex-1 min-h-[120px] resize-none rounded-lg border border-border bg-transparent p-3 text-sm text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-[color:var(--module-notas)]/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) void handleSave()
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-tertiary">Cmd+Enter para guardar</span>
          <button
            onClick={() => void handleSave()}
            disabled={!text.trim() || saving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            style={{
              background: 'var(--module-notas)',
              color: 'white',
            }}
          >
            {saved ? 'Guardada' : saving ? 'Guardando...' : 'Guardar nota'}
          </button>
        </div>
      </div>
    </DashboardPanel>
  )
}
