'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useProjectsStore } from '@/stores/projects-store';
import { TagChip } from './tag-chip';
import { COLOR_PRESETS } from '@/lib/constants/colors';

const PRESET_COLORS = COLOR_PRESETS.map((p) => p.value);

interface TagManagerProps {
  projectId: string;
}

export function TagManager({ projectId }: TagManagerProps) {
  const projectTags = useProjectsStore((s) => s.projectTags);
  const addTag = useProjectsStore((s) => s.addTag);
  const updateTagAction = useProjectsStore((s) => s.updateTag);
  const removeTag = useProjectsStore((s) => s.removeTag);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('var(--accent-terracotta)');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    addTag(projectId, newName.trim(), newColor);
    setNewName('');
    setNewColor('var(--accent-terracotta)');
  }

  function startEdit(tag: { id: string; name: string; color: string }) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function saveEdit() {
    if (!editingId || !editName.trim()) return;
    updateTagAction(editingId, { name: editName.trim(), color: editColor });
    setEditingId(null);
  }

  function handleDelete(tagId: string) {
    if (confirmDeleteId === tagId) {
      removeTag(tagId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(tagId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
        Etiquetas del proyecto
      </label>

      {/* Existing tags list */}
      {projectTags.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {projectTags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2">
              {editingId === tag.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-6 w-6 cursor-pointer rounded border-none bg-transparent"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 rounded-md border border-accent bg-card px-2 py-0.5 text-xs text-foreground focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="text-accent transition-colors hover:text-foreground"
                  >
                    <Check size={14} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-text-tertiary transition-colors hover:text-foreground"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </>
              ) : (
                <>
                  <TagChip tag={tag} size="md" />
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(tag)}
                      className="text-text-tertiary transition-colors hover:text-accent"
                    >
                      <Pencil size={12} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tag.id)}
                      className={`transition-colors ${
                        confirmDeleteId === tag.id
                          ? 'text-red-500'
                          : 'text-text-tertiary hover:text-red-500'
                      }`}
                      title={confirmDeleteId === tag.id ? 'Click de nuevo para confirmar' : 'Eliminar'}
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create new tag */}
      <div className="flex items-center gap-2">
        {/* Color picker */}
        <div className="relative">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent"
          />
        </div>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Nueva etiqueta..."
          className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="rounded-md bg-sand px-2 py-1.5 text-xs text-text-secondary transition-colors hover:bg-border disabled:opacity-40"
        >
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Color presets */}
      <div className="mt-2 flex items-center gap-1">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setNewColor(color)}
            className={`h-4 w-4 rounded-full transition-transform hover:scale-125 ${
              newColor === color ? 'ring-2 ring-offset-1 ring-accent' : ''
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
