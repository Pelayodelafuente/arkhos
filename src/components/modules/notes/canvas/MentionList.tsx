"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { FileText } from "lucide-react"
import type { Note } from "@/types/notes"

interface Props {
  items: Note[]
  command: (item: { id: string; label: string }) => void
}

export interface MentionListRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

export const MentionList = forwardRef<MentionListRef, Props>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

   
  useEffect(() => setSelectedIndex(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        const item = items[selectedIndex]
        if (item) command({ id: item.id, label: item.title })
        return true
      }
      return false
    },
  }))

  if (!items.length) {
    return (
      <div
        style={{
          position: 'fixed',
          zIndex: 9999,
          background: 'var(--bg-card, #fff)',
          border: '1px solid var(--border-stone, var(--border-stone))',
          borderRadius: 12,
          padding: '6px',
          boxShadow: '0 4px 20px rgba(26,23,20,0.10)',
          minWidth: 200,
        }}
      >
        <div style={{ padding: '6px 8px', fontSize: 12, color: 'var(--text-tertiary, var(--text-muted))' }}>
          Sin resultados
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        zIndex: 9999,
        background: 'var(--bg-card, #fff)',
        border: '1px solid var(--border-stone, var(--border-stone))',
        borderRadius: 12,
        padding: '4px',
        boxShadow: '0 4px 20px rgba(26,23,20,0.10)',
        minWidth: 220,
        maxHeight: 240,
        overflowY: 'auto',
      }}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => command({ id: item.id, label: item.title })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 10px',
            borderRadius: 8,
            border: 'none',
            background: index === selectedIndex ? 'var(--bg-sand, #F0EBE1)' : 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--text-primary, #1A1714)',
            fontSize: 13,
          }}
        >
          <FileText size={13} strokeWidth={1.75} style={{ color: 'var(--module-notas, var(--module-notas))', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </span>
        </button>
      ))}
    </div>
  )
})

MentionList.displayName = 'MentionList'
