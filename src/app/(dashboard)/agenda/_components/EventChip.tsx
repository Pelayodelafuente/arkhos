"use client"

import type { CronosItem } from "@/types/agenda"
import { formatTime } from "@/lib/agenda/dates"

interface Props {
  item: CronosItem
  onSelect: (item: CronosItem) => void
  /** compacto = solo punto + título (celdas de mes). */
  compact?: boolean
}

/** Chip de evento para celdas de mes y franjas de "todo el día". */
export function EventChip({ item, onSelect, compact }: Props) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onSelect(item)
      }}
      title={item.title}
      className="flex w-full items-center gap-1 overflow-hidden rounded px-1 py-0.5 text-left text-[11px] leading-tight transition-colors hover:bg-sand"
      style={
        compact
          ? undefined
          : {
              backgroundColor: `color-mix(in srgb, ${item.color} 16%, transparent)`,
            }
      }
    >
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      {!item.allDay && !compact && (
        <span className="flex-shrink-0 font-mono text-[10px] text-text-tertiary">
          {formatTime(item.start)}
        </span>
      )}
      <span
        className={`truncate ${item.completed ? "text-text-tertiary line-through" : "text-foreground"}`}
      >
        {item.title}
      </span>
    </button>
  )
}
