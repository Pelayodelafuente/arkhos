"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

interface SelectCustomOption {
  value: string
  label: string
}

interface SelectCustomProps {
  value: string
  onChange: (value: string) => void
  options: SelectCustomOption[]
  placeholder?: string
  className?: string
}

export function SelectCustom({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  className = "",
}: SelectCustomProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          flex w-full items-center justify-between gap-2
          rounded-md border border-border bg-background
          px-2 py-1 text-xs font-sans text-text-secondary
          cursor-pointer select-none
          transition-colors duration-150
          hover:border-[#C4704A]/40 hover:text-foreground
          focus:outline-none focus:ring-1 focus:ring-[#C4704A]/40
          ${open ? "border-[#C4704A]/40 text-foreground" : ""}
        `}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={12}
          strokeWidth={1.75}
          className={`flex-shrink-0 text-text-tertiary transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          role="listbox"
          className="
            absolute left-0 top-full z-50 mt-1
            min-w-full rounded-md border border-border bg-card
            py-1 shadow-[0_4px_20px_rgba(26,23,20,0.08)]
            animate-fade-in
          "
          style={{ animationDuration: "120ms" }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`
                flex w-full items-center px-3 py-1.5
                text-xs font-sans text-left
                transition-colors duration-100
                hover:bg-sand
                ${opt.value === value
                  ? "text-foreground font-medium"
                  : "text-text-secondary"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
