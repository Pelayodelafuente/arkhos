"use client"

import { useState, useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { subscriptionServices, type SubscriptionService } from "@/data/subscriptionServices"

interface ServicesComboboxProps {
  value: string
  onSelect: (service: SubscriptionService | null) => void
  placeholder?: string
}

export function ServicesCombobox({
  value,
  onSelect,
  placeholder = "Buscar servicio...",
}: ServicesComboboxProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [prevValue, setPrevValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  if (value !== prevValue) {
    setPrevValue(value)
    setQuery(value)
  }

  const filtered = query
    ? subscriptionServices.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase())
      )
    : subscriptionServices

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (service: SubscriptionService) => {
    setQuery(service.name)
    onSelect(service)
    setOpen(false)
  }

  const handleCustom = () => {
    onSelect(null)
    setOpen(false)
  }

  const handleClear = () => {
    setQuery("")
    onSelect(null)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">
          Servicio
        </label>
        <div className="relative">
          <Search
            size={15}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-foreground"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[240px] overflow-y-auto rounded-xl border border-border bg-card"
          style={{ boxShadow: "var(--shadow-modal)" }}
        >
          {filtered.map((service) => {
            const IconComponent = service.icon
            return (
              <button
                key={service.id}
                onClick={() => handleSelect(service)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-sand"
              >
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${service.color}1A` }}
                >
                  <IconComponent width={16} height={16} />
                </div>
                <span className="text-sm text-foreground">{service.name}</span>
              </button>
            )
          })}

          {/* Custom option */}
          <button
            onClick={handleCustom}
            className="flex w-full items-center gap-3 border-t border-border px-3 py-2.5 text-left transition-colors hover:bg-sand"
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-sand">
              <span className="text-xs font-semibold text-text-tertiary">?</span>
            </div>
            <span className="text-sm text-text-secondary">Personalizado</span>
          </button>
        </div>
      )}
    </div>
  )
}
