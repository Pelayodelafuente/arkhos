"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Tag, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useNotesStore, useAllTags } from "@/stores/notes-store"

interface Props {
  userId: string
}

export function NotesToolbar({ userId }: Props) {
  const performSearch = useNotesStore((s) => s.performSearch)
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery)
  const activeTag = useNotesStore((s) => s.activeTag)
  const setActiveTag = useNotesStore((s) => s.setActiveTag)
  const isSearching = useNotesStore((s) => s.isSearching)
  const allTags = useAllTags()

  const [localSearch, setLocalSearch] = useState("")
  const [searchExpanded, setSearchExpanded] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Tags scroll state
  const tagsScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Debounced search — llama a performSearch (FTS server-side)
  useEffect(() => {
    const t = setTimeout(() => performSearch(userId, localSearch), 300)
    return () => clearTimeout(t)
  }, [localSearch, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const checkScroll = useCallback(() => {
    const el = tagsScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
    const el = tagsScrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener("scroll", checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      ro.disconnect()
    }
  }, [allTags, checkScroll])

  const scrollLeft = () => tagsScrollRef.current?.scrollBy({ left: -160, behavior: "smooth" })
  const scrollRight = () => tagsScrollRef.current?.scrollBy({ left: 160, behavior: "smooth" })

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search — compact expandable (igual que Gastos) */}
      <div
        className={`relative flex h-9 items-center overflow-hidden rounded-full border border-border bg-card transition-all ${
          searchExpanded ? 'w-[260px] px-3 gap-2' : 'w-9 justify-center hover:bg-sand'
        }`}
        style={{
          transitionDuration: 'var(--transition-normal)',
          transitionTimingFunction: 'var(--ease-out-expo)',
        }}
        onClick={() => {
          if (!searchExpanded) {
            setSearchExpanded(true)
            setTimeout(() => searchRef.current?.focus(), 50)
          }
        }}
      >
        {isSearching && searchExpanded && !localSearch ? (
          <div className="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-border border-t-[#B07A3A]" />
        ) : (
          <Search size={14} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
        )}
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar notas..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onBlur={() => { if (!localSearch) setSearchExpanded(false) }}
          tabIndex={searchExpanded ? 0 : -1}
          className={`min-w-0 bg-transparent text-sm text-foreground placeholder:text-text-tertiary focus:outline-none transition-opacity ${
            searchExpanded ? 'flex-1 opacity-100' : 'w-0 opacity-0 pointer-events-none'
          }`}
        />
        {localSearch && searchExpanded && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLocalSearch(""); setSearchQuery(""); searchRef.current?.focus() }}
            className="flex-shrink-0 text-text-tertiary hover:text-foreground"
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Tag filters with scroll */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1">
          <Tag size={13} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />

          {/* Scroll wrapper */}
          <div className="relative flex items-center">
            {/* Left arrow */}
            {canScrollLeft && (
              <button
                onClick={scrollLeft}
                className="absolute left-0 z-10 flex h-full items-center pl-0.5 pr-2"
                style={{ background: "linear-gradient(to right, var(--bg-cream) 60%, transparent)" }}
              >
                <ChevronLeft size={13} strokeWidth={2} className="text-text-tertiary" />
              </button>
            )}

            {/* Scrollable tag list */}
            <div
              ref={tagsScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto"
              style={{ maxWidth: "min(480px, 50vw)", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium bg-foreground text-card transition-colors whitespace-nowrap flex-shrink-0"
                >
                  Todas
                </button>
              )}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTag === tag
                      ? "bg-[#B07A3A] text-white"
                      : "bg-sand text-text-secondary hover:bg-border"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Right arrow */}
            {canScrollRight && (
              <button
                onClick={scrollRight}
                className="absolute right-0 z-10 flex h-full items-center pr-0.5 pl-2"
                style={{ background: "linear-gradient(to left, var(--bg-cream) 60%, transparent)" }}
              >
                <ChevronRight size={13} strokeWidth={2} className="text-text-tertiary" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
