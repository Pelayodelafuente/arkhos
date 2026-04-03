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
        {isSearching && !localSearch && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-[#7a9b76]" />
        )}
        {localSearch && (
          <button onClick={() => { setLocalSearch(""); setSearchQuery("") }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-foreground">
            <X size={14} strokeWidth={1.75} />
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
              <style>{`.notes-tags-scroll::-webkit-scrollbar { display: none; }`}</style>
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
                      ? "bg-[#7a9b76] text-white"
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
