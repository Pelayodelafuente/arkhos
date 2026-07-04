"use client";

import { useState } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useProjectsStore } from "@/stores/projects-store";
import { useUIStore, useToast } from "@/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import {
  uploadProjectLogo,
  deleteProjectLogo,
  createProjectType,
  createProjectStatus,
  deleteProjectType,
  deleteProjectStatus,
} from "@/lib/supabase/projects";
import { ProjectIcon } from "./project-icon";
import { StatusBadge } from "./status-badge";
import { IconPicker } from "./icon-picker";
import { LogoUpload } from "./logo-upload";
import { TypeStatusSelect } from "./type-status-manager";
import { TagManager } from "./tag-manager";
import type {
  CreateProjectInput,
  Project,
  ProjectTypeRecord,
  ProjectStatusRecord,
} from "@/types/projects";

interface ProjectModalProps {
  userId: string;
  editProject?: Project | null;
  projectTypes: ProjectTypeRecord[];
  projectStatuses: ProjectStatusRecord[];
  onTypesChange?: (types: ProjectTypeRecord[]) => void;
  onStatusesChange?: (statuses: ProjectStatusRecord[]) => void;
  /** When true, only "edit-project" modal is allowed (prevents stale "new-project" state from canvas) */
  disableNewProject?: boolean;
}

export function ProjectModal({
  userId,
  editProject,
  projectTypes,
  projectStatuses,
  onTypesChange,
  onStatusesChange,
  disableNewProject = false,
}: ProjectModalProps) {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addProject = useProjectsStore((s) => s.addProject);
  const editProjectAction = useProjectsStore((s) => s.editProject);
  const toast = useToast();

  const isOpen = disableNewProject
    ? activeModal === "edit-project"
    : (activeModal === "new-project" || activeModal === "edit-project");
  const isEditing = activeModal === "edit-project" && !!editProject;

  const defaultStatus = projectStatuses.find((s) => s.is_default)?.name ?? projectStatuses[0]?.name ?? "Idea";
  const defaultType = projectTypes[0]?.name ?? "Web";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Globe");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [type, setType] = useState(defaultType);
  const [status, setStatus] = useState(defaultStatus);
  const [stackInput, setStackInput] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Local copies of types/statuses (updated when user creates new ones inline)
  const [localTypes, setLocalTypes] = useState(projectTypes);
  const [localStatuses, setLocalStatuses] = useState(projectStatuses);

  const [prevTypes, setPrevTypes] = useState(projectTypes);
  if (projectTypes !== prevTypes) {
    setPrevTypes(projectTypes);
    setLocalTypes(projectTypes);
  }

  const [prevStatuses, setPrevStatuses] = useState(projectStatuses);
  if (projectStatuses !== prevStatuses) {
    setPrevStatuses(projectStatuses);
    setLocalStatuses(projectStatuses);
  }

  // Populate form when editing
  const [prevFormSync, setPrevFormSync] = useState<{
    activeModal: typeof activeModal;
    isEditing: boolean;
    editProject: typeof editProject;
    defaultType: string;
    defaultStatus: string;
  } | null>(null);

  if (
    !prevFormSync ||
    prevFormSync.activeModal !== activeModal ||
    prevFormSync.isEditing !== isEditing ||
    prevFormSync.editProject !== editProject ||
    prevFormSync.defaultType !== defaultType ||
    prevFormSync.defaultStatus !== defaultStatus
  ) {
    setPrevFormSync({ activeModal, isEditing, editProject, defaultType, defaultStatus });
    if (isEditing && editProject) {
      setName(editProject.name);
      setDescription(editProject.description ?? "");
      setIcon(editProject.icon);
      setLogoUrl(editProject.logo_url);
      setType(editProject.type);
      setStatus(editProject.status);
      setStack(editProject.stack);
    } else if (activeModal === "new-project") {
      setName("");
      setDescription("");
      setIcon("Globe");
      setLogoUrl(null);
      setType(defaultType);
      setStatus(defaultStatus);
      setStack([]);
    }
    setErrors({});
  }

  // Auto-set icon based on type (only when creating)
  const [prevIconSync, setPrevIconSync] = useState<{
    type: string;
    isEditing: boolean;
    localTypes: ProjectTypeRecord[];
  } | null>(null);

  if (
    !prevIconSync ||
    prevIconSync.type !== type ||
    prevIconSync.isEditing !== isEditing ||
    prevIconSync.localTypes !== localTypes
  ) {
    setPrevIconSync({ type, isEditing, localTypes });
    if (!isEditing) {
      const typeRecord = localTypes.find((t) => t.name === type);
      if (typeRecord) setIcon(typeRecord.icon);
    }
  }

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

  async function handleLogoUpload(file: File): Promise<string> {
    if (!isEditing || !editProject) {
      toast.error("Guarda el proyecto primero para subir un logo");
      throw new Error("Project must exist to upload logo");
    }
    const client = createClient();
    const url = await uploadProjectLogo(client, userId, editProject.id, file);
    setLogoUrl(url);
    await editProjectAction(editProject.id, { logo_url: url });
    return url;
  }

  async function handleLogoRemove(): Promise<void> {
    if (!isEditing || !editProject || !logoUrl) return;
    const client = createClient();
    await deleteProjectLogo(client, userId, editProject.id, logoUrl);
    setLogoUrl(null);
  }

  async function handleCreateType(name: string, extra: { icon?: string; color?: string }) {
    const client = createClient();
    const newType = await createProjectType(client, userId, {
      name,
      icon: extra.icon,
      color: extra.color,
      sort_order: localTypes.length,
    });
    const updated = [...localTypes, newType];
    setLocalTypes(updated);
    onTypesChange?.(updated);
  }

  async function handleCreateStatus(name: string, extra: { icon?: string; color?: string }) {
    const client = createClient();
    const newStatus = await createProjectStatus(client, userId, {
      name,
      color: extra.color,
      sort_order: localStatuses.length,
    });
    const updated = [...localStatuses, newStatus];
    setLocalStatuses(updated);
    onStatusesChange?.(updated);
  }

  async function handleDeleteType(typeName: string) {
    const record = localTypes.find((t) => t.name === typeName);
    if (!record) return;
    const client = createClient();
    await deleteProjectType(client, record.id);
    const updated = localTypes.filter((t) => t.id !== record.id);
    setLocalTypes(updated);
    onTypesChange?.(updated);
    if (type === typeName) setType(updated[0]?.name ?? "");
  }

  async function handleDeleteStatus(statusName: string) {
    const record = localStatuses.find((s) => s.name === statusName);
    if (!record) return;
    const client = createClient();
    await deleteProjectStatus(client, record.id);
    const updated = localStatuses.filter((s) => s.id !== record.id);
    setLocalStatuses(updated);
    onStatusesChange?.(updated);
    if (status === statusName) setStatus(updated[0]?.name ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
        description: description.trim() || null,
        icon,
        logo_url: logoUrl,
        type,
        status,
        stack,
      });
    } else {
      const input: CreateProjectInput = {
        name: name.trim(),
        description: description.trim() || null,
        icon,
        type,
        status,
        stack,
      };
      await addProject(userId, input);
    }

    setSaving(false);
    closeModal();
  }

  const statusColor = localStatuses.find((s) => s.name === status)?.color ?? "#9a7a5a";

  return (
    <Modal
      open={isOpen}
      onClose={closeModal}
      title={isEditing ? "Editar proyecto" : "Nuevo proyecto"}
      className="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="submit" form="project-modal-form" size="sm" loading={saving}>
            {isEditing ? "Guardar" : "Crear proyecto"}
          </Button>
        </div>
      }
    >
      <form id="project-modal-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Preview */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-sand/40 p-3">
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 flex-shrink-0 rounded-lg border border-border object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: "rgba(196,112,74,0.1)" }}
            >
              <ProjectIcon icon={icon} size={20} className="text-accent" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-base text-foreground">
              {name || "Nombre del proyecto"}
            </p>
            <p className="text-xs text-text-tertiary">{type}</p>
          </div>
          <StatusBadge status={status} color={statusColor} />
        </div>

        {/* Logo upload (only in edit mode) */}
        {isEditing && (
          <LogoUpload
            logoUrl={logoUrl}
            onUpload={handleLogoUpload}
            onRemove={handleLogoRemove}
          />
        )}

        {/* Icon picker */}
        <IconPicker value={icon} onChange={setIcon} />

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

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descripción del proyecto..."
            rows={3}
            className="w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Type + Status row */}
        <div className="grid grid-cols-2 gap-3">
          <TypeStatusSelect
            label="Tipo"
            value={type}
            options={localTypes
              .filter((t, i, arr) => arr.findIndex((x) => x.name === t.name) === i)
              .map((t) => ({ value: t.name, label: t.name }))}
            onChange={setType}
            onCreateNew={handleCreateType}
            onDeleteOption={handleDeleteType}
            mode="type"
          />
          <TypeStatusSelect
            label="Estado"
            value={status}
            options={localStatuses.map((s) => ({ value: s.name, label: s.name }))}
            onChange={setStatus}
            onCreateNew={handleCreateStatus}
            onDeleteOption={handleDeleteStatus}
            mode="status"
          />
        </div>

        {/* Tags (only when editing — tags need a project to exist) */}
        {isEditing && editProject && (
          <TagManager projectId={editProject.id} />
        )}

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

      </form>
    </Modal>
  );
}
