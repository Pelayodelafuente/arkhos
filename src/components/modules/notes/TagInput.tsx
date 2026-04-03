"use client"

import { useState, useRef, type KeyboardEvent } from "react"
import { X, Sparkles, Plus } from "lucide-react"

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  aiSuggestedTags?: string[]
  suggestLoading?: boolean
  onSuggestTags?: () => void
  onDismissAiTag?: (tag: string) => void
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
  aiSuggestedTags = [],
  suggestLoading = false,
  onSuggestTags,
  onDismissAiTag,
}: Props) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput("")
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const acceptAiTag = (tag: string) => {
    addTag(tag)
    onDismissAiTag?.(tag)
  }

  const filteredSuggestions = input.length > 0
    ? suggestions.filter((s) => s.includes(input.toLowerCase()) && !tags.includes(s))
    : []

  const visibleAiTags = aiSuggestedTags.filter((t) => !tags.includes(t))

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 min-h-[36px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: 'rgba(122,155,118,0.12)', color: '#5a7a56' }}
          >
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-foreground">
              <X size={10} strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input) addTag(input) }}
          placeholder={tags.length === 0 ? "Añadir etiquetas..." : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-text-tertiary"
        />
        {onSuggestTags && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSuggestTags() }}
            disabled={suggestLoading}
            title="Sugerir tags con IA"
            className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:text-[#7a9b76] transition-colors disabled:opacity-40 flex-shrink-0"
          >
            {suggestLoading ? (
              <span className="h-3 w-3 rounded-full border border-[#7a9b76] border-t-transparent animate-spin" />
            ) : (
              <Sparkles size={12} strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>

      {/* Autocomplete suggestions */}
      {filteredSuggestions.length > 0 && (
        <div className="mt-1 rounded-md border border-border bg-card p-1 shadow-sm">
          {filteredSuggestions.slice(0, 5).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="block w-full text-left rounded px-2 py-1 text-xs text-text-secondary hover:bg-sand transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* AI suggested tags */}
      {visibleAiTags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {visibleAiTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded-md border text-[11px] font-medium"
              style={{ background: 'rgba(122,155,118,0.06)', borderColor: 'rgba(122,155,118,0.3)', color: '#5a7a56', padding: '2px 6px' }}
            >
              <Sparkles size={9} strokeWidth={2} className="opacity-70" />
              {tag}
              <button
                type="button"
                onClick={() => acceptAiTag(tag)}
                className="ml-0.5 hover:opacity-100 opacity-70"
                title="Añadir"
              >
                <Plus size={10} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => onDismissAiTag?.(tag)}
                className="hover:opacity-100 opacity-50"
                title="Descartar"
              >
                <X size={9} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
