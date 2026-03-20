"use client"

import type { NoteColor } from "@/types/notes"
import { NOTE_COLOR_CONFIG } from "@/types/notes"

export { NOTE_COLOR_CONFIG as NOTE_COLORS }

interface Props {
  value: NoteColor
  onChange: (c: NoteColor) => void
}

export function NoteColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      {NOTE_COLOR_CONFIG.map((c) => (
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
