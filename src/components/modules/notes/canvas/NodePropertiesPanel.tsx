"use client"

import { useState } from "react"
import { Lock, Unlock, Trash2, ExternalLink } from "lucide-react"
import { useNotesStore } from "@/stores/notes-store"
import { NOTE_COLOR_CONFIG } from "@/types/notes"
import type { CanvasNode } from "@/types/notes"

interface Props { node: CanvasNode }

export function NodePropertiesPanel({ node }: Props) {
  const updateNodeContent = useNotesStore((s) => s.updateNodeContent)
  const toggleNodeLocked = useNotesStore((s) => s.toggleNodeLocked)
  const removeNode = useNotesStore((s) => s.removeNode)
  const updateNodeColor = useNotesStore((s) => s.updateNodeColor)

  const [labelValue, setLabelValue] = useState(node.label || '')
  const [urlValue, setUrlValue] = useState(node.url || '')

  const isUrl = node.node_type === 'url' || node.node_type === 'image'
  const isText = node.node_type === 'text'

  const nodeTypeLabel =
    node.node_type === 'note' ? 'Nota'
    : node.node_type === 'text' ? 'Texto'
    : node.node_type === 'url' ? 'URL'
    : 'Imagen'

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 w-52 rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-md p-3 flex flex-col gap-3"
      style={{ zIndex: 9999 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {nodeTypeLabel}
      </div>

      {/* Label / title */}
      {isText && (
        <div>
          <label className="text-[10px] text-text-tertiary block mb-1">
            Contenido
          </label>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onBlur={() => { if (labelValue !== (node.label || '')) updateNodeContent(node.id, labelValue) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateNodeContent(node.id, labelValue)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
          />
        </div>
      )}

      {/* URL */}
      {isUrl && (
        <div>
          <label className="text-[10px] text-text-tertiary block mb-1">URL</label>
          <div className="flex gap-1">
            <input
              className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onBlur={() => { if (urlValue !== (node.url || '')) updateNodeContent(node.id, urlValue) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateNodeContent(node.id, urlValue)
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
            {node.url && (
              <button
                className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md border border-border text-text-tertiary hover:text-foreground hover:bg-sand transition-colors"
                onClick={() => window.open(node.url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink size={12} strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Color */}
      <div>
        <label className="text-[10px] text-text-tertiary block mb-1">Color</label>
        <div className="flex flex-wrap gap-1.5">
          {NOTE_COLOR_CONFIG.map(cfg => (
            <button
              key={cfg.value}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${node.color === cfg.value ? 'scale-110' : ''}`}
              style={{ backgroundColor: cfg.border, borderColor: node.color === cfg.value ? 'var(--accent-terracotta)' : 'transparent' }}
              title={cfg.label}
              onClick={() => updateNodeColor(node.id, cfg.value)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Lock / Delete */}
      <div className="flex gap-1.5">
        <button
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-sand hover:text-foreground transition-colors border border-border"
          onClick={() => toggleNodeLocked(node.id)}
        >
          {node.locked ? <Unlock size={12} strokeWidth={1.75} /> : <Lock size={12} strokeWidth={1.75} />}
          {node.locked ? 'Desbloquear' : 'Bloquear'}
        </button>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition-colors border border-border"
          onClick={() => removeNode(node.id)}
          title="Eliminar nodo"
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
