"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Layers, FileText } from "lucide-react";
import { Modal, Button, Input, Badge } from "@/components/ui";
import { useProjectsStore } from "@/stores/projects-store";
import { useUIStore, useToast } from "@/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import {
  uploadProjectLogo,
  deleteProjectLogo,
  createProjectType,
  createProjectStatus,
  getProjectTemplates,
  createPhase as createPhaseApi,
  createTask as createTaskApi,
} from "@/lib/supabase/projects";
import { ProjectIcon } from "./project-icon";
import { StatusBadge } from "./status-badge";
import { IconPicker } from "./icon-picker";
import { LogoUpload } from "./logo-upload";
import { TypeStatusSelect } from "./type-status-manager";
import type {
  CreateProjectInput,
  Project,
  ProjectTemplate,
  TemplatePhase,
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
}

export function ProjectModal({
  userId,
  editProject,
  projectTypes,
  projectStatuses,
  onTypesChange,
  onStatusesChange,
}: ProjectModalProps) {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addProject = useProjectsStore((s) => s.addProject);
  const editProjectAction = useProjectsStore((s) => s.editProject);
  const fetchProject = useProjectsStore((s) => s.fetchProject);
  const toast = useToast();

  const isOpen = activeModal === "new-project" || activeModal === "edit-project";
  const isEditing = activeModal === "edit-project" && !!editProject;

  const defaultStatus = projectStatuses.find((s) => s.is_default)?.name ?? projectStatuses[0]?.name ?? "Idea";
  const defaultType = projectTypes[0]?.name ?? "Web";

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Globe");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [type, setType] = useState(defaultType);
  const [status, setStatus] = useState(defaultStatus);
  const [stackInput, setStackInput] = useState("");
  const [stack, setStack] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Template state (only for creating)
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);

  // Local copies of types/statuses (updated when user creates new ones inline)
  const [localTypes, setLocalTypes] = useState(projectTypes);
  const [localStatuses, setLocalStatuses] = useState(projectStatuses);

  useEffect(() => {
    setLocalTypes(projectTypes);
  }, [projectTypes]);

  useEffect(() => {
    setLocalStatuses(projectStatuses);
  }, [projectStatuses]);

  // Load templates when creating
  useEffect(() => {
    if (activeModal === "new-project") {
      const client = createClient();
      getProjectTemplates(client, userId).then(setTemplates);
    }
  }, [userId, activeModal]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && editProject) {
      setName(editProject.name);
      setIcon(editProject.icon);
      setLogoUrl(editProject.logo_url);
      setType(editProject.type);
      setStatus(editProject.status);
      setStack(editProject.stack);
    } else if (activeModal === "new-project") {
      setName("");
      setIcon("Globe");
      setLogoUrl(null);
      setType(defaultType);
      setStatus(defaultStatus);
      setStack([]);
      setSelectedTemplate(null);
      setShowTemplates(true);
    }
    setErrors({});
  }, [activeModal, isEditing, editProject, defaultType, defaultStatus]);

  // Auto-set icon based on type (only when creating)
  useEffect(() => {
    if (!isEditing) {
      const typeRecord = localTypes.find((t) => t.name === type);
      if (typeRecord) setIcon(typeRecord.icon);
    }
  }, [type, isEditing, localTypes]);

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

  async function applyTemplatePhases(projectId: string, phases: TemplatePhase[]) {
    const client = createClient();
    for (const tp of phases) {
      const phase = await createPhaseApi(client, {
        project_id: projectId,
        name: tp.name,
        sort_order: tp.sort_order,
      });
      for (let i = 0; i < tp.tasks.length; i++) {
        await createTaskApi(client, {
          phase_id: phase.id,
          text: tp.tasks[i].text,
          priority: tp.tasks[i].priority,
          sort_order: i,
        });
      }
    }
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
        icon,
        logo_url: logoUrl,
        type,
        status,
        stack,
      });
    } else {
      const input: CreateProjectInput = {
        name: name.trim(),
        icon,
        type,
        status,
        stack,
      };
      const project = await addProject(userId, input);

      // Apply template phases/tasks if selected
      if (project && selectedTemplate) {
        const template = templates.find((t) => t.id === selectedTemplate);
        if (template && template.phases.length > 0) {
          await applyTemplatePhases(project.id, template.phases);
          await fetchProject(project.id);
        }
      }
    }

    setSaving(false);
    closeModal();
  }

  const statusColor = localStatuses.find((s) => s.name === status)?.color ?? "#888780";

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

        {/* Type + Status row */}
        <div className="grid grid-cols-2 gap-3">
          <TypeStatusSelect
            label="Tipo"
            value={type}
            options={localTypes.map((t) => ({ value: t.name, label: t.name }))}
            onChange={setType}
            onCreateNew={handleCreateType}
            mode="type"
          />
          <TypeStatusSelect
            label="Estado"
            value={status}
            options={localStatuses.map((s) => ({ value: s.name, label: s.name }))}
            onChange={setStatus}
            onCreateNew={handleCreateStatus}
            mode="status"
          />
        </div>

        {/* Template selection (only when creating) */}
        {!isEditing && templates.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className="mb-2 flex w-full items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-foreground"
            >
              <Layers size={13} strokeWidth={2} />
              Plantilla inicial
              {showTemplates ? (
                <ChevronUp size={13} strokeWidth={2} className="ml-auto" />
              ) : (
                <ChevronDown size={13} strokeWidth={2} className="ml-auto" />
              )}
            </button>

            {showTemplates && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {/* No template option */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className={`rounded-lg border p-2.5 text-left transition-colors ${
                      selectedTemplate === null
                        ? "border-accent bg-[rgba(196,112,74,0.06)]"
                        : "border-border bg-card hover:border-accent/40"
                    }`}
                  >
                    <p className="text-xs font-medium text-foreground">Sin plantilla</p>
                    <p className="mt-0.5 text-[10px] text-text-tertiary">Proyecto en blanco</p>
                  </button>

                  {/* Template cards */}
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`rounded-lg border p-2.5 text-left transition-colors ${
                        selectedTemplate === t.id
                          ? "border-accent bg-[rgba(196,112,74,0.06)]"
                          : "border-border bg-card hover:border-accent/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-medium text-foreground">{t.name}</p>
                        {t.is_system && (
                          <Badge variant="gray">Sistema</Badge>
                        )}
                      </div>
                      {t.description && (
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-text-tertiary">
                          {t.description}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-text-tertiary">
                        {t.phases.length} {t.phases.length === 1 ? "fase" : "fases"}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Template preview */}
                {selectedTemplate && (() => {
                  const tpl = templates.find((t) => t.id === selectedTemplate);
                  if (!tpl) return null;
                  return (
                    <div className="mt-2 rounded-md border border-border bg-sand/40 px-3 py-2">
                      <p className="mb-1 text-[10px] font-medium text-text-tertiary">
                        Fases incluidas:
                      </p>
                      <div className="space-y-0.5">
                        {tpl.phases
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((p, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-text-secondary">
                              <FileText size={11} strokeWidth={2} className="flex-shrink-0 text-text-tertiary" />
                              <span>{p.name}</span>
                              {p.tasks.length > 0 && (
                                <span className="text-[10px] text-text-tertiary">
                                  ({p.tasks.length} {p.tasks.length === 1 ? "tarea" : "tareas"})
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
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
