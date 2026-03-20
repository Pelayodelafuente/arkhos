"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Tag, X } from "lucide-react"
import { useNotesStore, useAllTags } from "@/stores/notes-store"

export function NotesToolbar() {
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery)
  const activeTag = useNotesStore((s) => s.activeTag)
  const setActiveTag = useNotesStore((s) => s.setActiveTag)
  const allTags = useAllTags()

  const [localSearch, setLocalSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localSearch), 150)
    return () => clearTimeout(t)
  }, [localSearch, setSearchQuery])

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar notas..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-text-tertiary focus:border-[#7a9b76] focus:outline-none"
        />
        {localSearch && (
          <button onClick={() => { setLocalSearch(""); setSearchQuery("") }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-foreground">
            <X size={14} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Tag size={13} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="rounded-md px-2 py-1 text-[11px] font-medium bg-foreground text-card transition-colors"
            >
              Todas
            </button>
          )}
          {allTags.slice(0, 8).map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                activeTag === tag
                  ? 'bg-[#7a9b76] text-white'
                  : 'bg-sand text-text-secondary hover:bg-border'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
