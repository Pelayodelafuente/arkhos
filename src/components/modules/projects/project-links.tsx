"use client";

import { useState } from "react";
import {
  ExternalLink,
  Github,
  Globe,
  FileText,
  Server,
  Database,
  Layers,
  Plus,
  X,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui";
import { useProjectsStore } from "@/stores/projects-store";
import type { ProjectLink } from "@/types/projects";

// ─── Icon mapping ───────────────────

const LINK_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  Github,
  Globe,
  Figma: Globe,
  FileText,
  Server,
  ExternalLink,
  Database,
  Layers,
};

const ICON_OPTIONS = [
  { value: "Github", label: "GitHub" },
  { value: "Globe", label: "Web" },
  { value: "Figma", label: "Figma" },
  { value: "FileText", label: "Docs" },
  { value: "Server", label: "Server" },
  { value: "ExternalLink", label: "Enlace" },
  { value: "Database", label: "Base de datos" },
  { value: "Layers", label: "Capas" },
];

// ─── Props ──────────────────────────

interface ProjectLinksProps {
  links: ProjectLink[];
  projectId: string;
  userId: string;
}

export function ProjectLinks({ links, projectId, userId }: ProjectLinksProps) {
  const addProjectLink = useProjectsStore((s) => s.addProjectLink);
  const removeProjectLink = useProjectsStore((s) => s.removeProjectLink);
  const reorderProjectLinksAction = useProjectsStore((s) => s.reorderProjectLinksAction);

  const [showForm, setShowForm] = useState(false);
  const [formIcon, setFormIcon] = useState("ExternalLink");
  const [formLabel, setFormLabel] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(links, oldIndex, newIndex);
    reorderProjectLinksAction(reordered.map((l) => l.id));
  }

  async function handleAddLink() {
    if (!formLabel.trim() || !formUrl.trim()) return;
    if (!formUrl.startsWith("http://") && !formUrl.startsWith("https://")) return;

    await addProjectLink(userId, {
      project_id: projectId,
      label: formLabel.trim(),
      url: formUrl.trim(),
      icon: formIcon,
      sort_order: links.length,
    });

    setFormLabel("");
    setFormUrl("");
    setFormIcon("ExternalLink");
    setShowForm(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={links.map((l) => l.id)}
          strategy={horizontalListSortingStrategy}
        >
          {links.map((link) => (
            <SortableLinkChip
              key={link.id}
              link={link}
              isConfirmingDelete={confirmDeleteId === link.id}
              onConfirmDelete={() => setConfirmDeleteId(link.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onDelete={() => {
                removeProjectLink(link.id);
                setConfirmDeleteId(null);
              }}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add link button / form */}
      {showForm ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
          {/* Icon select */}
          <select
            value={formIcon}
            onChange={(e) => setFormIcon(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Label */}
          <input
            type="text"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="Etiqueta"
            className="w-28 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />

          {/* URL */}
          <input
            type="url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddLink();
              if (e.key === "Escape") setShowForm(false);
            }}
            placeholder="https://..."
            className="w-44 rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />

          <Button variant="primary" size="sm" onClick={handleAddLink}>
            Guardar
          </Button>
          <button
            onClick={() => setShowForm(false)}
            className="text-text-tertiary transition-colors hover:text-foreground"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-text-tertiary transition-colors hover:border-accent hover:text-accent"
        >
          <Plus size={12} strokeWidth={2} />
          Enlace
        </button>
      )}
    </div>
  );
}

// ─── Sortable link chip ─────────────

interface SortableLinkChipProps {
  link: ProjectLink;
  isConfirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}

function SortableLinkChip({
  link,
  isConfirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: SortableLinkChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = LINK_ICONS[link.icon] || ExternalLink;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative inline-flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1 text-xs text-text-secondary transition-colors hover:text-accent"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
        tabIndex={-1}
      >
        <GripVertical size={10} strokeWidth={1.75} />
      </button>

      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5"
      >
        <IconComponent size={12} strokeWidth={2} />
        {link.label}
      </a>

      {/* Delete button */}
      {isConfirmingDelete ? (
        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            className="text-[10px] font-medium text-red-500 hover:underline"
          >
            Eliminar
          </button>
          <button
            onClick={onCancelDelete}
            className="text-[10px] text-text-tertiary hover:text-foreground"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={onConfirmDelete}
          className="text-text-tertiary opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        >
          <X size={10} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
