'use client';

import { X } from 'lucide-react';
import type { Tag } from '@/types/projects';

interface TagChipProps {
  tag: Tag;
  size?: 'sm' | 'md';
  onRemove?: () => void;
}

export function TagChip({ tag, size = 'sm', onRemove }: TagChipProps) {
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${
        isSm ? 'rounded-full px-1.5 py-0.5 text-[10px]' : 'rounded-md px-2 py-0.5 text-xs'
      }`}
      style={{
        backgroundColor: `color-mix(in srgb, ${tag.color} 13%, transparent)`,
        color: tag.color,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="transition-opacity hover:opacity-70"
          style={{ color: tag.color }}
        >
          <X size={isSm ? 8 : 10} strokeWidth={2} />
        </button>
      )}
    </span>
  );
}
