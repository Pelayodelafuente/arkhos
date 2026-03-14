"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, Select } from "@/components/ui";
import { useProjectsStore } from "@/stores/projects-store";
import { useUIStore } from "@/stores/ui-store";
import { ProjectIcon } from "./project-icon";
import { StatusBadge } from "./status-badge";
import {
  PROJECT_TYPES,
  PROJECT_STATUSES,
  PROJECT_TYPE_ICONS,
  PROJECT_STATUS_CONFIG,
  type ProjectType,
  type ProjectStatus,
  type CreateProjectInput,
  type Project,
} from "@/types/projects";

const AVAILABLE_ICONS = [
  "Globe", "Terminal", "Zap", "Smartphone", "Code", "Pen", "Box",
] as const;

interface ProjectModalProps {
  userId: string;
  editProject?: Project | null;
}

export function ProjectModal({ userId, editProject }: ProjectModalProps) {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addProject = useProjectsStore((s) => s.addProject);
  const editProjectAction = useProjectsStore((s) => s.editProject);

  const isOpen = activeModal === "new-project" || activeModal === "edit-project";
  const isEditing = activeModal === "edit-project" && !!editProject;

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Globe");
  const [type, setType] = useState<ProjectType>("Web");
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [stackInput, setStackInput] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (isEditing && editProject) {
      setName(editProject.name);
      setIcon(editProject.icon);
      setType(editProject.type);
      setStatus(editProject.status);
      setStack(editProject.stack);
      setTags(editProject.tags);
      setStartDate(editProject.start_date ?? "");
    } else if (activeModal === "new-project") {
      setName("");
      setIcon("Globe");
      setType("Web");
      setStatus("idea");
      setStack([]);
      setTags([]);
      setStartDate("");
    }
    setErrors({});
  }, [activeModal, isEditing, editProject]);

  // Auto-set icon based on type
  useEffect(() => {
    if (!isEditing) {
      setIcon(PROJECT_TYPE_ICONS[type]);
    }
  }, [type, isEditing]);

  function handleStackKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && stackInput.trim()) {
      e.preventDefault();
      const val = stackInput.trim().replace(/,$/, "");
      if (val && !stack.includes(val)) {
        setStack((s) => [...s, val]);
      }
      setStackInput("");
    }
  }

  function handleTagsKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagsInput.trim()) {
      e.preventDefault();
      const val = tagsInput.trim().replace(/,$/, "");
      if (val && !tags.includes(val)) {
        setTags((s) => [...s, val]);
      }
      setTagsInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "El nombre es obligatorio";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    if (isEditing && editProject) {
      await editProjectAction(editProject.id, {
        name: name.trim(),
        icon,
        type,
        status,
        stack,
        tags,
        start_date: startDate || null,
      });
    } else {
      const input: CreateProjectInput = {
        name: name.trim(),
        icon,
        type,
        status,
        stack,
        tags,
        start_date: startDate || null,
      };
      await addProject(userId, input);
    }

    setSaving(false);
    closeModal();
  }

  return (
    <Modal
      open={isOpen}
      onClose={closeModal}
      title={isEditing ? "Editar proyecto" : "Nuevo proyecto"}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Preview */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-sand/40 p-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "rgba(196,112,74,0.1)" }}
          >
            <ProjectIcon icon={icon} size={20} className="text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-base text-foreground">
              {name || "Nombre del proyecto"}
            </p>
            <p className="text-xs text-text-tertiary">{type}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Icon selector */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Icono
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_ICONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                  icon === iconName
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:border-accent"
                }`}
              >
                <ProjectIcon
                  icon={iconName}
                  size={16}
                  className={icon === iconName ? "text-accent" : "text-text-secondary"}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          error={errors.name}
          placeholder="Mi proyecto"
        />

        {/* Type + Status row */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as ProjectType)}
            options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Select
            label="Estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            options={PROJECT_STATUSES.map((s) => ({
              value: s,
              label: PROJECT_STATUS_CONFIG[s].label,
            }))}
          />
        </div>

        {/* Stack */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Stack
          </label>
          <div className="flex flex-wrap gap-1.5">
            {stack.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center gap-1 rounded-md bg-sand px-2 py-0.5 text-xs text-text-secondary"
              >
                {tech}
                <button
                  type="button"
                  onClick={() => setStack((s) => s.filter((t) => t !== tech))}
                  className="text-text-tertiary hover:text-foreground"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={stackInput}
            onChange={(e) => setStackInput(e.target.value)}
            onKeyDown={handleStackKeyDown}
            placeholder="Escribe y pulsa Enter"
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-0.5 text-xs text-text-secondary"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags((s) => s.filter((t) => t !== tag))}
                  className="text-text-tertiary hover:text-foreground"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onKeyDown={handleTagsKeyDown}
            placeholder="Escribe y pulsa Enter"
            className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Start date */}
        <Input
          label="Fecha de inicio"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            {isEditing ? "Guardar" : "Crear proyecto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
