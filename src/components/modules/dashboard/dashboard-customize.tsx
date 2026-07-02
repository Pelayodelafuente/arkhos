'use client'

import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react'

// ══════════════════════════════════════
// Personalización del Dashboard bento: mostrar/ocultar y reordenar widgets.
// El estado vive en DashboardView (persistido en localStorage); aquí solo la UI.
// ══════════════════════════════════════

interface DashboardCustomizeProps {
  labels: Record<string, string>
  order: string[]
  hidden: string[]
  onToggle: (key: string) => void
  onMove: (key: string, dir: -1 | 1) => void
  onReset: () => void
}

export function DashboardCustomize({
  labels,
  order,
  hidden,
  onToggle,
  onMove,
  onReset,
}: DashboardCustomizeProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
          open
            ? 'border-border bg-sand text-foreground'
            : 'border-transparent text-text-tertiary hover:border-border hover:bg-sand/60 hover:text-text-secondary'
        }`}
      >
        <SlidersHorizontal size={12} strokeWidth={1.75} aria-hidden="true" />
        Personalizar
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Personalizar widgets del dashboard"
          className="absolute right-0 top-full z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-border bg-card"
          style={{ boxShadow: 'var(--shadow-modal, 0 16px 48px rgba(26,23,20,0.18))' }}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold text-foreground">Widgets</span>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-[10px] text-text-tertiary transition-colors hover:text-accent"
              title="Restaurar disposición por defecto"
            >
              <RotateCcw size={10} strokeWidth={2} aria-hidden="true" />
              Restaurar
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto p-1.5">
            {order.map((key, idx) => {
              const isHidden = hidden.includes(key)
              return (
                <li
                  key={key}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-sand/60"
                >
                  <button
                    type="button"
                    onClick={() => onToggle(key)}
                    title={isHidden ? 'Mostrar widget' : 'Ocultar widget'}
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors ${
                      isHidden
                        ? 'text-text-tertiary hover:text-foreground'
                        : 'text-accent hover:text-accent/80'
                    }`}
                  >
                    {isHidden ? (
                      <EyeOff size={13} strokeWidth={1.75} />
                    ) : (
                      <Eye size={13} strokeWidth={1.75} />
                    )}
                  </button>
                  <span
                    className={`min-w-0 flex-1 truncate text-xs ${
                      isHidden ? 'text-text-tertiary line-through' : 'text-foreground'
                    }`}
                  >
                    {labels[key] ?? key}
                  </span>
                  <button
                    type="button"
                    onClick={() => onMove(key, -1)}
                    disabled={idx === 0}
                    title="Subir"
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-foreground disabled:opacity-25"
                  >
                    <ChevronUp size={13} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(key, 1)}
                    disabled={idx === order.length - 1}
                    title="Bajar"
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-foreground disabled:opacity-25"
                  >
                    <ChevronDown size={13} strokeWidth={1.75} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
