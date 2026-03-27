'use client';

import { useState, useRef, useEffect } from 'react';
import { Tag as TagIcon, ChevronDown } from 'lucide-react';
import { useProjectsStore } from '@/stores/projects-store';
import { TagChip } from './tag-chip';
import type { Tag } from '@/types/projects';

interface TagSelectorProps {
  taskId: string;
  selectedTags: Tag[];
}

export function TagSelector({ taskId, selectedTags }: TagSelectorProps) {
  const projectTags = useProjectsStore((s) => s.projectTags);
  const addTagToTask = useProjectsStore((s) => s.addTagToTask);
  const removeTagFromTask = useProjectsStore((s) => s.removeTagFromTask);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedIds = new Set(selectedTags.map((t) => t.id));
  const available = projectTags.filter(
    (t) => !selectedIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Selected tags + trigger */}
      <div className="flex flex-wrap items-center gap-1">
        {selectedTags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            size="sm"
            onRemove={() => removeTagFromTask(taskId, tag.id)}
          />
        ))}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] text-text-tertiary transition-colors hover:bg-sand hover:text-text-secondary"
        >
          <TagIcon size={10} strokeWidth={2} />
          <ChevronDown size={8} strokeWidth={2} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-card p-1.5 shadow-[0_4px_20px_rgba(26,23,20,0.08)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar etiqueta..."
            className="mb-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            autoFocus
          />
          {available.length === 0 ? (
            <p className="px-2 py-1.5 text-[10px] text-text-tertiary">
              {projectTags.length === 0 ? 'Sin etiquetas en el proyecto' : 'No hay más etiquetas'}
            </p>
          ) : (
            <div className="max-h-[150px] overflow-y-auto">
              {available.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    addTagToTask(taskId, tag.id);
                    setSearch('');
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-sand"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-foreground">{tag.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
