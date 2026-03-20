"use client"

import type { NoteColor } from "@/types/notes"

const COLORS: { value: NoteColor; bg: string; border: string; label: string }[] = [
  { value: 'default', bg: '#FAF7F2', border: '#E2D9CA', label: 'Neutro' },
  { value: 'sage', bg: '#eef3ee', border: '#7a9b76', label: 'Sage' },
  { value: 'terracotta', bg: '#faf0ec', border: '#C4704A', label: 'Terracotta' },
  { value: 'stone', bg: '#f5f2ee', border: '#B0A48F', label: 'Stone' },
  { value: 'blue', bg: '#eef2f8', border: '#6B8CC4', label: 'Blue' },
  { value: 'gold', bg: '#faf5ec', border: '#C4974A', label: 'Gold' },
]

export { COLORS as NOTE_COLORS }

interface Props {
  value: NoteColor
  onChange: (c: NoteColor) => void
}

export function NoteColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      {COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={`h-6 w-6 rounded-full border-2 transition-all ${
            value === c.value ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'hover:scale-105'
          }`}
          style={{ backgroundColor: c.bg, borderColor: c.border }}
          title={c.label}
        />
      ))}
    </div>
  )
}
