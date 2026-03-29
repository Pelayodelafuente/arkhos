"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Download,
  BookmarkPlus,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  ExternalLink,
  BookOpen,
  GripVertical,
  ChevronUp,
  Calendar,
  Target,
  Clock,
  ClipboardList,
  Copy,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Button, Progress, Skeleton, Modal, Input, DropdownMenu, Tooltip } from "@/components/ui";
import type { DropdownMenuItem } from "@/components/ui";
import { useProjectsStore } from "@/stores/projects-store";
import { useUIStore, useToast } from "@/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import { getProjectTypes, getProjectStatuses, seedUserDefaults, createProjectTemplate } from "@/lib/supabase/projects";
import {
  DEFAULT_PROJECT_TYPES,
  DEFAULT_PROJECT_STATUSES,
  PHASE_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  type PhaseStatus,
  type TaskPriority,
  type ProjectTypeRecord,
  type ProjectStatusRecord,
  type TemplatePhase,
} from "@/types/projects";
import { ProjectIcon } from "./project-icon";
import { StatusBadge } from "./status-badge";
import { ProjectModal } from "./project-modal";
import { ExportModal } from "./export-modal";
import { ConfirmModal } from "./confirm-modal";
import { EnrichedTaskItem } from "./enriched-task-item";
import { ProjectLinks } from "./project-links";
import KanbanView from "./kanban-view";
import DashboardView from "./dashboard-view";
import { TaskSlideOver } from "./task-slide-over";
import TableView from "./table-view";
import TimelineView from "./timeline-view";
import type { PhaseTask } from "@/types/projects";

// ─── Framer Motion variants ──────────
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_OUT },
  },
};

const phaseContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const phaseItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
};

const taskContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const taskItemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: EASE_OUT },
  },
};

// ─── Debounce helper ──────────────────

function useDebounce(ms: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return useCallback(
    (fn: () => void) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fn, ms);
    },
    [ms]
  );
}

// ─── Confetti effect ─────────────────

interface ConfettiParticle {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
}

// Stable particles — generated once at module load (avoids Math.random in render)
const CONFETTI_PARTICLES: ConfettiParticle[] = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.5,
  color: i % 2 === 0 ? "#C4704A" : "#5b8c6a",
  size: 6 + Math.random() * 4,
}))

function Confetti() {
  const particles = CONFETTI_PARTICLES;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall rounded-sm"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ──────────────────

interface ProjectDetailProps {
  projectId: string;
  userId: string;
}

export function ProjectDetail({ projectId, userId }: ProjectDetailProps) {
  const project = useProjectsStore((s) => s.activeProject);
  const loading = useProjectsStore((s) => s.loading);
  const fetchProject = useProjectsStore((s) => s.fetchProject);
  const removeProject = useProjectsStore((s) => s.removeProject);
  const addPhase = useProjectsStore((s) => s.addPhase);
  const editPhase = useProjectsStore((s) => s.editPhase);
  const removePhase = useProjectsStore((s) => s.removePhase);
  const addTask = useProjectsStore((s) => s.addTask);
  const editTask = useProjectsStore((s) => s.editTask);
  const removeTask = useProjectsStore((s) => s.removeTask);
  const reorderPhasesAction = useProjectsStore((s) => s.reorderPhasesAction);
  const reorderTasksAction = useProjectsStore((s) => s.reorderTasksAction);
  const clearActiveProject = useProjectsStore((s) => s.clearActiveProject);
  const duplicateProject = useProjectsStore((s) => s.duplicateProject);
  const editProject = useProjectsStore((s) => s.editProject);
  const openModal = useUIStore((s) => s.openModal);

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewTab, setViewTab] = useState<"progress" | "kanban" | "dashboard" | "table" | "timeline">("progress");
  const [slideOverTask, setSlideOverTask] = useState<PhaseTask | null>(null);
  const [projectTypes, setProjectTypes] = useState<ProjectTypeRecord[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatusRecord[]>([]);

  // Phase CRUD state
  const [newPhaseName, setNewPhaseName] = useState("");
  const [showNewPhase, setShowNewPhase] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseName, setEditingPhaseName] = useState("");
  const [deletePhaseTarget, setDeletePhaseTarget] = useState<{ id: string; name: string } | null>(null);

  // Task CRUD state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<{ id: string; text: string } | null>(null);

  // Save as template state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const toast = useToast();

  // Confetti state for 100% completion
  const [showConfetti, setShowConfetti] = useState(false);
  const prevProgressRef = useRef<number | null>(null);

  useEffect(() => {
    fetchProject(projectId);
    return () => clearActiveProject();
  }, [projectId, fetchProject, clearActiveProject]);

  useEffect(() => {
    async function loadMeta() {
      const client = createClient();
      await seedUserDefaults(client, userId, {
        types: DEFAULT_PROJECT_TYPES,
        statuses: DEFAULT_PROJECT_STATUSES,
      });
      const [types, statuses] = await Promise.all([
        getProjectTypes(client, userId),
        getProjectStatuses(client, userId),
      ]);
      setProjectTypes(types);
      setProjectStatuses(statuses);
    }
    loadMeta();
  }, [userId]);

  useEffect(() => {
    if (project) {
      const inProgress = project.phases
        .filter((p) => p.status === "in-progress")
        .map((p) => p.id);
      setExpandedPhases(new Set(inProgress));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  // Mobile detection for dnd fallback — start false, set after mount to avoid hydration mismatch
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handlePhasesDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !project) return;
    const oldIndex = project.phases.findIndex((p) => p.id === active.id);
    const newIndex = project.phases.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(project.phases, oldIndex, newIndex);
    reorderPhasesAction(reordered.map((p) => p.id));
  }

  function handleTasksDragEnd(phaseId: string) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !project) return;
      const phase = project.phases.find((p) => p.id === phaseId);
      if (!phase) return;
      const oldIndex = phase.tasks.findIndex((t) => t.id === active.id);
      const newIndex = phase.tasks.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(phase.tasks, oldIndex, newIndex);
      reorderTasksAction(phaseId, reordered.map((t) => t.id));
    };
  }

  function movePhase(idx: number, direction: -1 | 1) {
    if (!project) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= project.phases.length) return;
    const reordered = arrayMove(project.phases, idx, newIdx);
    reorderPhasesAction(reordered.map((p) => p.id));
  }

  function moveTask(phaseId: string, taskIdx: number, direction: -1 | 1) {
    if (!project) return;
    const phase = project.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    const newIdx = taskIdx + direction;
    if (newIdx < 0 || newIdx >= phase.tasks.length) return;
    const reordered = arrayMove(phase.tasks, taskIdx, newIdx);
    reorderTasksAction(phaseId, reordered.map((t) => t.id));
  }

  const debounce = useDebounce(800);
  const debouncedEditTask = useCallback(
    (taskId: string, content: string) => {
      debounce(() => editTask(taskId, { content }));
    },
    [debounce, editTask]
  );

  // Computed before early returns so hooks are always called unconditionally
  const totalTrackedSeconds = (project?.phases ?? []).reduce(
    (sum, p) => sum + p.tasks.reduce((ts, t) => ts + t.tracked_seconds, 0), 0
  );
  const totalTasks = (project?.phases ?? []).reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = (project?.phases ?? []).reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.done).length,
    0
  );
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Confetti trigger when project reaches 100%
  useEffect(() => {
    if (overallProgress === 100 && prevProgressRef.current !== null && prevProgressRef.current < 100) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2500);
      return () => clearTimeout(timer);
    }
    prevProgressRef.current = overallProgress;
  }, [overallProgress]);

  if (loading && !project) return <DetailSkeleton />;

  if (!project) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-tertiary">Proyecto no encontrado</p>
        <Link href="/proyectos" className="mt-2 inline-block text-sm text-accent hover:underline">
          Volver a proyectos
        </Link>
      </div>
    );
  }

  function togglePhase(phaseId: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }

  function cyclePhaseStatus(phaseId: string, current: PhaseStatus) {
    const order: PhaseStatus[] = ["pending", "in-progress", "done"];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    editPhase(phaseId, { status: order[nextIdx] });
  }

  function handleAddTask(phaseId: string) {
    const text = newTaskText[phaseId]?.trim();
    if (!text) return;
    const phase = project?.phases.find((p) => p.id === phaseId);
    addTask({ phase_id: phaseId, text, sort_order: phase?.tasks.length ?? 0 });
    setNewTaskText((prev) => ({ ...prev, [phaseId]: "" }));
  }

  function handleAddPhase() {
    if (!newPhaseName.trim() || !project) return;
    addPhase({
      project_id: project.id,
      name: newPhaseName.trim(),
      sort_order: project.phases.length,
    });
    setNewPhaseName("");
    setShowNewPhase(false);
  }

  function handleStartEditPhase(phaseId: string, currentName: string) {
    setEditingPhaseId(phaseId);
    setEditingPhaseName(currentName);
  }

  function handleSaveEditPhase() {
    if (editingPhaseId && editingPhaseName.trim()) {
      editPhase(editingPhaseId, { name: editingPhaseName.trim() });
    }
    setEditingPhaseId(null);
  }

  function handleStartEditTask(taskId: string, currentText: string) {
    setEditingTaskId(taskId);
    setEditingTaskText(currentText);
  }

  function handleSaveEditTask() {
    if (editingTaskId && editingTaskText.trim()) {
      editTask(editingTaskId, { text: editingTaskText.trim() });
    }
    setEditingTaskId(null);
  }

  function cyclePriority(taskId: string, current: TaskPriority) {
    const order: TaskPriority[] = ["none", "low", "medium", "high", "urgent"];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    editTask(taskId, { priority: order[nextIdx] });
  }

  async function handleDelete() {
    if (!project) return;
    await removeProject(project.id);
    window.location.href = "/proyectos";
  }

  async function handleDuplicate() {
    const newId = await duplicateProject(userId);
    if (newId) {
      window.location.href = `/proyectos/${newId}`;
    }
  }

  async function handleArchive() {
    if (!project) return;
    await editProject(project.id, { status: "Archivado" });
    window.location.href = "/proyectos";
  }

  async function handleUnarchive() {
    if (!project) return;
    await editProject(project.id, { status: "Idea" });
  }

  async function handleSaveTemplate() {
    if (!project || !templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const client = createClient();
      const templatePhases: TemplatePhase[] = project.phases.map((p) => ({
        name: p.name,
        sort_order: p.sort_order,
        tasks: p.tasks.map((t) => ({ text: t.text, priority: t.priority })),
      }));
      await createProjectTemplate(client, userId, {
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        type: project.type,
        phases: templatePhases,
      });
      toast.success("Plantilla guardada");
      setShowSaveTemplate(false);
      setTemplateName("");
      setTemplateDescription("");
    } catch {
      toast.error("Error al guardar la plantilla");
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Back link */}
      <Link
        href="/proyectos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-tertiary transition-colors hover:text-accent"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Proyectos
      </Link>

      {/* ── Project header (v2) ───────── */}
      <div className="mb-6 rounded-xl border-b border-border bg-sand p-5">
        {/* Row 1: Icon + Name + Badges + Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {project.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={project.logo_url}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded-[10px] border border-border bg-sand object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[10px] bg-sand">
                <ProjectIcon icon={project.icon} size={24} className="text-accent" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-[22px] leading-tight text-foreground">
                {project.name}
              </h1>
              <StatusBadge
                status={project.status}
                color={projectStatuses.find((s) => s.name === project.status)?.color}
              />
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
                {project.type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => openModal("edit-project")}>
              <Edit3 size={14} strokeWidth={2} />
              Editar
            </Button>
            <DropdownMenu
              align="right"
              items={[
                {
                  label: "Guardar plantilla",
                  icon: <BookmarkPlus size={14} strokeWidth={2} />,
                  onClick: () => {
                    setTemplateName(project.name);
                    setTemplateDescription("");
                    setShowSaveTemplate(true);
                  },
                },
                {
                  label: "Duplicar",
                  icon: <Copy size={14} strokeWidth={2} />,
                  onClick: handleDuplicate,
                },
                {
                  label: "Exportar",
                  icon: <Download size={14} strokeWidth={2} />,
                  onClick: () => openModal("export-project"),
                },
                project.status === "Archivado"
                  ? {
                      label: "Desarchivar",
                      icon: <ArchiveRestore size={14} strokeWidth={2} />,
                      onClick: handleUnarchive,
                    }
                  : {
                      label: "Archivar",
                      icon: <Archive size={14} strokeWidth={2} />,
                      onClick: handleArchive,
                    },
                {
                  label: "Eliminar",
                  icon: <Trash2 size={14} strokeWidth={2} />,
                  onClick: () => setConfirmDelete(true),
                  variant: "danger",
                },
              ] as DropdownMenuItem[]}
            />
          </div>
        </div>

        {/* Row 2: Description (inline editable) */}
        {project.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
            {project.description}
          </p>
        ) : (
          <button
            onClick={() => openModal("edit-project")}
            className="mt-2 text-sm text-text-tertiary transition-colors hover:text-accent"
          >
            Añade una descripción...
          </button>
        )}

        {/* Row 3: Metadata */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
          {project.start_date && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} strokeWidth={2} />
              {new Date(project.start_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
          {project.target_date && (
            <>
              <span className="text-border">·</span>
              <span
                className={`inline-flex items-center gap-1 ${
                  new Date(project.target_date) < new Date(new Date().toDateString())
                    ? "font-medium text-red-500"
                    : ""
                }`}
              >
                <Target size={12} strokeWidth={2} />
                {new Date(project.target_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </>
          )}
          {totalTrackedSeconds > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Clock size={12} strokeWidth={2} />
                {Math.floor(totalTrackedSeconds / 3600)}h {Math.floor((totalTrackedSeconds % 3600) / 60)}m
              </span>
            </>
          )}
          {project.stack.length > 0 && (
            <>
              <span className="text-border">·</span>
              <div className="flex flex-wrap gap-1">
                {project.stack.slice(0, 4).map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-medium text-text-secondary"
                  >
                    {tech}
                  </span>
                ))}
                {project.stack.length > 4 && (
                  <Tooltip content={project.stack.slice(4).join(', ')} position="top">
                    <span className="cursor-default text-[10px] text-text-tertiary">
                      +{project.stack.length - 4} más
                    </span>
                  </Tooltip>
                )}
              </div>
            </>
          )}
        </div>

        {/* Row 4: Quick links */}
        <div className="mt-3">
          <ProjectLinks
            links={project.links || []}
            projectId={project.id}
            userId={userId}
          />
        </div>
      </div>

      {/* View tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
        {([
          { key: "progress", label: "Progreso" },
          { key: "kanban", label: "Kanban" },
          { key: "dashboard", label: "Dashboard" },
          { key: "table", label: "Tabla" },
          { key: "timeline", label: "Timeline" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewTab === tab.key
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overall progress — only show in progress and dashboard tabs */}
      {(viewTab === 'progress' || viewTab === 'dashboard') && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Progreso general</span>
            <span className="font-mono text-lg font-medium text-accent">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} />
          <div className="mt-2 flex items-center gap-3 text-xs text-text-tertiary">
            <span>
              <span className="font-mono font-medium text-foreground">{doneTasks}</span>/{totalTasks}{" "}
              tareas completadas
            </span>
            <span className="text-border">·</span>
            <span>
              <span className="font-mono font-medium text-foreground">{project.phases.length}</span>{" "}
              fases
            </span>
          </div>
        </div>
      )}

      {/* ═══ PROGRESS VIEW ═══ */}
      {viewTab === "progress" && (
        <motion.div
          className="space-y-3"
          variants={phaseContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handlePhasesDragEnd}
          >
            <SortableContext
              items={project.phases.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
              disabled={isMobile}
            >
              {project.phases.map((phase, idx) => (
                <motion.div key={phase.id} variants={phaseItemVariants}>
                <SortablePhaseItem
                  phase={phase}
                  idx={idx}
                  totalPhases={project.phases.length}
                  isExpanded={expandedPhases.has(phase.id)}
                  isMobile={isMobile}
                  projectId={projectId}
                  userId={userId}
                  editingPhaseId={editingPhaseId}
                  editingPhaseName={editingPhaseName}
                  editingTaskId={editingTaskId}
                  editingTaskText={editingTaskText}
                  newTaskText={newTaskText[phase.id] ?? ""}
                  sensors={sensors}
                  onTogglePhase={togglePhase}
                  onCycleStatus={cyclePhaseStatus}
                  onDeletePhase={(id, name) => setDeletePhaseTarget({ id, name })}
                  onStartEditPhase={handleStartEditPhase}
                  onEditPhaseNameChange={setEditingPhaseName}
                  onSaveEditPhase={handleSaveEditPhase}
                  onCancelEditPhase={() => setEditingPhaseId(null)}
                  onEditTask={editTask}
                  onStartEditTask={handleStartEditTask}
                  onEditTaskTextChange={setEditingTaskText}
                  onSaveEditTask={handleSaveEditTask}
                  onCancelEditTask={() => setEditingTaskId(null)}
                  onDeleteTask={(id, text) => setDeleteTaskTarget({ id, text })}
                  onCyclePriority={cyclePriority}
                  onNewTaskTextChange={(text) =>
                    setNewTaskText((prev) => ({ ...prev, [phase.id]: text }))
                  }
                  onAddTask={() => handleAddTask(phase.id)}
                  onTasksDragEnd={handleTasksDragEnd(phase.id)}
                  debouncedEditTask={debouncedEditTask}
                  onMovePhase={(dir) => movePhase(idx, dir)}
                  onMoveTask={(taskIdx, dir) => moveTask(phase.id, taskIdx, dir)}
                  onOpenSlideOver={(task) => setSlideOverTask(task)}
                />
                </motion.div>
              ))}
            </SortableContext>
          </DndContext>

          {/* Add phase inline */}
          {showNewPhase ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-accent bg-card p-3">
              <input
                autoFocus
                type="text"
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddPhase();
                  if (e.key === "Escape") {
                    setShowNewPhase(false);
                    setNewPhaseName("");
                  }
                }}
                placeholder="Nombre de la fase..."
                className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              />
              <Button size="sm" onClick={handleAddPhase}>
                Crear
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowNewPhase(false);
                  setNewPhaseName("");
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewPhase(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-text-tertiary transition-colors hover:border-accent hover:text-accent"
            >
              <Plus size={14} strokeWidth={2} />
              Añadir fase
            </button>
          )}
        </motion.div>
      )}

      {/* Kanban view */}
      {viewTab === "kanban" && (
        <KanbanView phases={project.phases} projectId={projectId} userId={userId} onOpenTask={setSlideOverTask} />
      )}

      {/* Dashboard view */}
      {viewTab === "dashboard" && <DashboardView phases={project.phases} />}

      {/* Table view */}
      {viewTab === "table" && (
        <TableView
          phases={project.phases}
          projectId={projectId}
          userId={userId}
          onOpenTask={setSlideOverTask}
        />
      )}

      {/* Timeline view */}
      {viewTab === "timeline" && (
        <TimelineView phases={project.phases} />
      )}

      {/* Delete project confirmation */}
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar proyecto"
        message={`Se eliminara el proyecto "${project.name}" y todos sus datos. Esta accion no se puede deshacer.`}
      />

      {/* Delete phase confirmation */}
      <ConfirmModal
        open={!!deletePhaseTarget}
        onClose={() => setDeletePhaseTarget(null)}
        onConfirm={() => {
          if (deletePhaseTarget) {
            removePhase(deletePhaseTarget.id);
            setDeletePhaseTarget(null);
          }
        }}
        title="Eliminar fase"
        message={
          deletePhaseTarget
            ? `¿Eliminar la fase "${deletePhaseTarget.name}" y todas sus tareas? Esta accion no se puede deshacer.`
            : ""
        }
      />

      {/* Delete task confirmation */}
      <ConfirmModal
        open={!!deleteTaskTarget}
        onClose={() => setDeleteTaskTarget(null)}
        onConfirm={() => {
          if (deleteTaskTarget) {
            removeTask(deleteTaskTarget.id);
            setDeleteTaskTarget(null);
          }
        }}
        title="Eliminar tarea"
        message={
          deleteTaskTarget
            ? `¿Eliminar la tarea "${deleteTaskTarget.text}"?`
            : ""
        }
      />

      {/* Edit modal — disableNewProject prevents stale modal state from canvas page */}
      <ProjectModal
        userId={userId}
        editProject={project}
        projectTypes={projectTypes}
        projectStatuses={projectStatuses}
        onTypesChange={setProjectTypes}
        onStatusesChange={setProjectStatuses}
        disableNewProject
      />

      {/* Export modal */}
      <ExportModal project={project} />

      {/* Confetti on 100% project completion */}
      {showConfetti && <Confetti />}

      {/* Save as template modal */}
      <Modal
        open={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        title="Guardar como plantilla"
        className="max-w-sm"
      >
        <div className="space-y-3">
          <Input
            label="Nombre de la plantilla"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Mi plantilla"
          />
          <Input
            label="Descripción (opcional)"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Breve descripción..."
          />
          <p className="text-xs text-text-tertiary">
            Se guardarán {project.phases.length} {project.phases.length === 1 ? "fase" : "fases"} y{" "}
            {project.phases.reduce((sum, p) => sum + p.tasks.length, 0)} tareas como plantilla reutilizable.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setShowSaveTemplate(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              loading={savingTemplate}
              disabled={!templateName.trim()}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Task slide-over */}
      <TaskSlideOver
        task={slideOverTask}
        projectId={projectId}
        userId={userId}
        onClose={() => setSlideOverTask(null)}
      />
    </motion.div>
  );
}

// ─── Sortable Phase Item ──────────────

interface SortablePhaseItemProps {
  phase: import("@/types/projects").ProjectPhase;
  idx: number;
  totalPhases: number;
  isExpanded: boolean;
  isMobile: boolean;
  projectId: string;
  userId: string;
  editingPhaseId: string | null;
  editingPhaseName: string;
  editingTaskId: string | null;
  editingTaskText: string;
  newTaskText: string;
  sensors: ReturnType<typeof useSensors>;
  onTogglePhase: (id: string) => void;
  onCycleStatus: (id: string, status: import("@/types/projects").PhaseStatus) => void;
  onDeletePhase: (id: string, name: string) => void;
  onStartEditPhase: (id: string, name: string) => void;
  onEditPhaseNameChange: (name: string) => void;
  onSaveEditPhase: () => void;
  onCancelEditPhase: () => void;
  onEditTask: (id: string, input: import("@/types/projects").UpdateTaskInput) => void;
  onStartEditTask: (id: string, text: string) => void;
  onEditTaskTextChange: (text: string) => void;
  onSaveEditTask: () => void;
  onCancelEditTask: () => void;
  onDeleteTask: (id: string, text: string) => void;
  onCyclePriority: (id: string, priority: import("@/types/projects").TaskPriority) => void;
  onNewTaskTextChange: (text: string) => void;
  onAddTask: () => void;
  onTasksDragEnd: (event: DragEndEvent) => void;
  debouncedEditTask: (taskId: string, content: string) => void;
  onMovePhase: (direction: -1 | 1) => void;
  onMoveTask: (taskIdx: number, direction: -1 | 1) => void;
  onOpenSlideOver: (task: PhaseTask) => void;
}

function SortablePhaseItem({
  phase,
  idx,
  totalPhases,
  isExpanded,
  isMobile,
  projectId,
  userId,
  editingPhaseId,
  editingPhaseName,
  editingTaskId,
  editingTaskText,
  newTaskText,
  sensors,
  onTogglePhase,
  onCycleStatus,
  onDeletePhase,
  onStartEditPhase,
  onEditPhaseNameChange,
  onSaveEditPhase,
  onCancelEditPhase,
  onEditTask,
  onStartEditTask,
  onEditTaskTextChange,
  onSaveEditTask,
  onCancelEditTask,
  onDeleteTask,
  onCyclePriority,
  onNewTaskTextChange,
  onAddTask,
  onTasksDragEnd,
  debouncedEditTask,
  onMovePhase,
  onMoveTask,
  onOpenSlideOver,
}: SortablePhaseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const phaseDoneTasks = phase.tasks.filter((t) => t.done).length;
  const phaseProgress =
    phase.tasks.length > 0
      ? Math.round((phaseDoneTasks / phase.tasks.length) * 100)
      : 0;
  const statusConfig = PHASE_STATUS_CONFIG[phase.status];
  const allTasksDone = phase.tasks.length > 0 && phaseDoneTasks === phase.tasks.length;

  return (
    <div ref={setNodeRef} style={style} className={`rounded-xl border border-border bg-card transition-[transform,box-shadow] duration-150 ease-out hover:translate-x-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${allTasksDone ? "animate-phase-complete" : ""}`}>
      {/* Phase header */}
      <div className="flex w-full items-center gap-3 p-4">
        {/* Drag handle or mobile arrows */}
        {isMobile ? (
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onMovePhase(-1)}
              disabled={idx === 0}
              className="text-text-tertiary transition-colors hover:text-accent disabled:opacity-30"
            >
              <ChevronUp size={12} strokeWidth={2} />
            </button>
            <button
              onClick={() => onMovePhase(1)}
              disabled={idx === totalPhases - 1}
              className="text-text-tertiary transition-colors hover:text-accent disabled:opacity-30"
            >
              <ChevronDown size={12} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-text-tertiary opacity-0 transition-opacity hover:text-accent group-hover:opacity-100 [div:hover>&]:opacity-100"
            tabIndex={-1}
          >
            <GripVertical size={14} strokeWidth={1.75} />
          </button>
        )}

        {/* Timeline dot */}
        <div className="flex flex-col items-center">
          <span
            className={`h-3 w-3 rounded-full border-2 ${
              phase.status === "in-progress" ? "animate-pulse" : ""
            }`}
            style={{
              borderColor: statusConfig.color,
              backgroundColor:
                phase.status === "done" ? statusConfig.color : "transparent",
            }}
          />
          {idx < totalPhases - 1 && (
            <span className="mt-1 h-4 w-px bg-border" />
          )}
        </div>

        <button
          onClick={() => onTogglePhase(phase.id)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <div className="flex-1">
            {editingPhaseId === phase.id ? (
              <input
                autoFocus
                value={editingPhaseName}
                onChange={(e) => onEditPhaseNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEditPhase();
                  if (e.key === "Escape") onCancelEditPhase();
                }}
                onBlur={onSaveEditPhase}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-md border border-accent bg-card px-2 py-0.5 text-sm font-medium text-foreground focus:outline-none"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium text-foreground"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onStartEditPhase(phase.id, phase.name);
                  }}
                >
                  {phase.name}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${statusConfig.color}14`,
                    color: statusConfig.color,
                  }}
                >
                  {statusConfig.label}
                </span>
              </div>
            )}
            {phase.tasks.length > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <Progress value={phaseProgress} className="w-24" />
                <span className="font-mono text-[10px] text-text-tertiary">
                  {phaseDoneTasks}/{phase.tasks.length}
                </span>
              </div>
            )}
          </div>
        </button>

        {/* Status cycle */}
        <button
          onClick={() => onCycleStatus(phase.id, phase.status)}
          className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-sand hover:text-foreground"
          title="Cambiar estado"
        >
          <span
            className="block h-4 w-4 rounded-full border-2"
            style={{ borderColor: statusConfig.color }}
          />
        </button>

        {/* Delete phase */}
        <button
          onClick={() => onDeletePhase(phase.id, phase.name)}
          className="rounded-md p-1 text-text-tertiary transition-colors hover:text-red-500"
          title="Eliminar fase"
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>

        <button onClick={() => onTogglePhase(phase.id)}>
          {isExpanded ? (
            <ChevronDown size={16} className="text-text-tertiary" />
          ) : (
            <ChevronRight size={16} className="text-text-tertiary" />
          )}
        </button>
      </div>

      {/* Phase body (expanded) */}
      {isExpanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {/* Empty state */}
          {phase.tasks.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-text-tertiary">
              <ClipboardList size={32} strokeWidth={1.5} />
              <span className="text-sm">Sin tareas todavía</span>
            </div>
          )}

          {/* Tasks with drag */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onTasksDragEnd}
          >
            <SortableContext
              items={phase.tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
              disabled={isMobile}
            >
              <motion.div
                className="space-y-1"
                variants={taskContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {phase.tasks.map((task, taskIdx) => (
                  <motion.div key={task.id} variants={taskItemVariants}>
                  <EnrichedTaskItem
                    task={task}
                    taskIdx={taskIdx}
                    totalTasks={phase.tasks.length}
                    isMobile={isMobile}
                    isEditing={editingTaskId === task.id}
                    editingText={editingTaskText}
                    projectId={projectId}
                    userId={userId}
                    onToggleDone={() => onEditTask(task.id, { done: !task.done, status: task.done ? 'todo' : 'done' })}
                    onStartEdit={() => onStartEditTask(task.id, task.text)}
                    onEditTextChange={onEditTaskTextChange}
                    onSaveEdit={onSaveEditTask}
                    onCancelEdit={onCancelEditTask}
                    onCyclePriority={() => onCyclePriority(task.id, task.priority)}
                    onDelete={() => onDeleteTask(task.id, task.text)}
                    debouncedEditTask={debouncedEditTask}
                    onMoveTask={(dir) => onMoveTask(taskIdx, dir)}
                    onOpenSlideOver={() => onOpenSlideOver(task)}
                  />
                  </motion.div>
                ))}
              </motion.div>
            </SortableContext>
          </DndContext>

          {/* Add task inline */}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => onNewTaskTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddTask();
                if (e.key === "Escape") onNewTaskTextChange("");
              }}
              placeholder="Nueva tarea..."
              className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
            <Button variant="ghost" size="sm" onClick={onAddTask}>
              <Plus size={14} strokeWidth={2} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sortable Task Item ───────────────

interface SortableTaskItemProps {
  task: import("@/types/projects").PhaseTask;
  taskIdx: number;
  totalTasks: number;
  isMobile: boolean;
  isEditing: boolean;
  editingText: string;
  notesOpen: boolean;
  onToggleDone: () => void;
  onStartEdit: () => void;
  onEditTextChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggleNotes: () => void;
  onCyclePriority: () => void;
  onDelete: () => void;
  debouncedEditTask: (taskId: string, content: string) => void;
  onMoveTask: (direction: -1 | 1) => void;
}

function SortableTaskItem({
  task,
  taskIdx,
  totalTasks,
  isMobile,
  isEditing,
  editingText,
  notesOpen,
  onToggleDone,
  onStartEdit,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onToggleNotes,
  onCyclePriority,
  onDelete,
  debouncedEditTask,
  onMoveTask,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasNotes = !!task.content;

  return (
    <div ref={setNodeRef} style={style}>
      <div className="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sand/30">
        {/* Drag handle or mobile arrows */}
        {isMobile ? (
          <div className="mt-0.5 flex flex-col gap-0">
            <button
              onClick={() => onMoveTask(-1)}
              disabled={taskIdx === 0}
              className="text-text-tertiary transition-colors hover:text-accent disabled:opacity-30"
            >
              <ChevronUp size={10} strokeWidth={2} />
            </button>
            <button
              onClick={() => onMoveTask(1)}
              disabled={taskIdx === totalTasks - 1}
              className="text-text-tertiary transition-colors hover:text-accent disabled:opacity-30"
            >
              <ChevronDown size={10} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab text-text-tertiary opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
            tabIndex={-1}
          >
            <GripVertical size={12} strokeWidth={1.75} />
          </button>
        )}

        {/* Checkbox */}
        <button
          onClick={onToggleDone}
          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
            task.done
              ? "border-accent bg-accent"
              : "border-border hover:border-accent"
          }`}
        >
          {task.done && (
            <Check size={10} strokeWidth={3} className="text-white" />
          )}
        </button>

        {/* Task text (editable) */}
        {isEditing ? (
          <input
            autoFocus
            value={editingText}
            onChange={(e) => onEditTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            onBlur={onSaveEdit}
            className="flex-1 rounded-md border border-accent bg-card px-2 py-0.5 text-sm text-foreground focus:outline-none"
          />
        ) : (
          <span
            className={`flex-1 cursor-text text-sm ${
              task.done
                ? "text-text-tertiary line-through"
                : "text-foreground"
            }`}
            onClick={onStartEdit}
          >
            {task.text}
          </span>
        )}

        {/* Notes indicator */}
        <button
          onClick={onToggleNotes}
          className={`mt-0.5 transition-colors ${
            hasNotes
              ? "text-accent"
              : "text-text-tertiary opacity-0 group-hover:opacity-100"
          }`}
          title="Apuntes"
        >
          <BookOpen size={13} strokeWidth={1.75} />
        </button>

        {/* Priority dot */}
        {task.priority !== "none" && (
          <button
            onClick={onCyclePriority}
            className="mt-1 h-2 w-2 rounded-full"
            style={{
              backgroundColor: TASK_PRIORITY_CONFIG[task.priority].color,
            }}
            title={TASK_PRIORITY_CONFIG[task.priority].label}
          />
        )}

        {/* Links */}
        {task.links.length > 0 && (
          <div className="flex items-center gap-1">
            {task.links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-tertiary transition-colors hover:text-accent"
                title={link.label || link.url}
              >
                <ExternalLink size={12} strokeWidth={2} />
              </a>
            ))}
          </div>
        )}

        {/* Delete task */}
        <button
          onClick={onDelete}
          className="text-text-tertiary opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Task notes (expandable) */}
      {notesOpen && (
        <TaskNotes
          taskId={task.id}
          content={task.content}
          onSave={debouncedEditTask}
        />
      )}
    </div>
  );
}

// ─── Task Notes sub-component ─────────

function TaskNotes({
  taskId,
  content,
  onSave,
}: {
  taskId: string;
  content: string;
  onSave: (taskId: string, content: string) => void;
}) {
  const [value, setValue] = useState(content);
  const charCount = value.length;

  return (
    <div className="ml-8 mr-2 mt-0.5 mb-1.5 rounded-lg border border-border bg-background p-3">
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onSave(taskId, e.target.value);
        }}
        placeholder="Escribe notas, ideas, snippets de codigo..."
        rows={3}
        className="w-full resize-y bg-transparent font-mono text-[13px] text-text-secondary placeholder:text-text-tertiary focus:outline-none"
      />
      <div className="mt-1 text-right font-mono text-[10px] text-text-tertiary">
        {charCount}
      </div>
    </div>
  );
}


// ─── Skeleton ─────────────────────────

function DetailSkeleton() {
  return (
    <div>
      <Skeleton rounded="md" className="mb-4 h-4 w-20" />
      <div className="mb-6 flex items-start gap-3">
        <Skeleton rounded="lg" className="h-12 w-12" />
        <div>
          <Skeleton rounded="md" className="mb-2 h-6 w-48" />
          <Skeleton rounded="full" className="h-4 w-24" />
        </div>
      </div>
      <Skeleton rounded="lg" className="mb-6 h-24 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} rounded="lg" className="mb-3 h-16 w-full" />
      ))}
    </div>
  );
}
