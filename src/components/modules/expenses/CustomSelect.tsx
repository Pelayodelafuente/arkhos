"use client"

import { useState, useRef, useEffect, useId } from "react"
import { ChevronDown, Check } from "lucide-react"

export interface CustomSelectOption {
  value: string
  label: string
  /** Icon element to show before the label */
  icon?: React.ReactNode
  /** Dot color swatch to show before the label */
  color?: string
}

interface CustomSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: CustomSelectOption[]
  /** 'list' = vertical list (default), 'grid' = 7-col compact grid (for day-of-month) */
  variant?: 'list' | 'grid'
  placeholder?: string
  error?: string
}

export function CustomSelect({
  label,
  value,
  onChange,
  options,
  variant = 'list',
  placeholder,
  error,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const labelId = useId()

  const selected = options.find((o) => o.value === value)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      {label && (
        <label id={labelId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        aria-labelledby={label ? labelId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-xl border bg-white/60 px-3 text-sm text-foreground outline-none transition-all duration-150 hover:bg-white cursor-pointer"
        style={{
          borderColor: error ? 'var(--error)' : open ? 'var(--accent-terracotta)' : 'var(--border-stone)',
          boxShadow: open ? '0 0 0 3px var(--accent-ring)' : undefined,
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.color && (
            <span
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selected.color }}
            />
          )}
          {selected?.icon && <span className="flex-shrink-0">{selected.icon}</span>}
          <span className={`truncate ${selected ? 'text-foreground' : 'text-text-tertiary'}`}>
            {selected?.label ?? placeholder ?? 'Seleccionar'}
          </span>
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`text-text-tertiary flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card"
          style={{
            boxShadow: 'var(--shadow-modal)',
            animation: 'scale-in 120ms cubic-bezier(0.16,1,0.3,1)',
            transformOrigin: 'top center',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {variant === 'grid' ? (
            // 7-column grid for day-of-month selector
            <div className="grid grid-cols-7 gap-0.5 p-2">
              {options.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false) }}
                    className="flex h-8 w-full items-center justify-center rounded-lg text-xs font-mono font-medium transition-colors duration-100 cursor-pointer"
                    style={{
                      background: isSelected ? 'var(--module-gastos)' : undefined,
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-sand)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = ''
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          ) : (
            // Vertical list
            <div className="py-1">
              {options.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => { onChange(opt.value); setOpen(false) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-100 cursor-pointer"
                    style={{
                      background: isSelected ? 'var(--bg-sand)' : undefined,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = ''
                    }}
                  >
                    {opt.color && (
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                    <span className="flex-1 text-left truncate">{opt.label}</span>
                    {isSelected && (
                      <Check size={13} strokeWidth={2} className="flex-shrink-0 text-accent" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  )
}
