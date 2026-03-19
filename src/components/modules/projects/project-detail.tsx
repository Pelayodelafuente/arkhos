"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Download,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  ExternalLink,
  BookOpen,
  GripVertical,
  ChevronUp,
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
import { Button, Progress, Modal, Skeleton } from "@/components/ui";
import { useProjectsStore } from "@/stores/projects-store";
import { useUIStore } from "@/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import { getProjectTypes, getProjectStatuses, seedUserDefaults } from "@/lib/supabase/projects";
import {
  DEFAULT_PROJECT_TYPES,
  DEFAULT_PROJECT_STATUSES,
  PHASE_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  type PhaseStatus,
  type TaskPriority,
  type ProjectTypeRecord,
  type ProjectStatusRecord,
} from "@/types/projects";
import { ProjectIcon } from "./project-icon";
import { StatusBadge } from "./status-badge";
import { ProjectModal } from "./project-modal";
import { ExportModal } from "./export-modal";
import { ConfirmModal } from "./confirm-modal";

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
  const openModal = useUIStore((s) => s.openModal);

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewTab, setViewTab] = useState<"progress" | "diagram" | "flow">("progress");
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

  // Task notes state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

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
  }, [project?.id]);

  // Mobile detection for dnd fallback
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 640px)").matches);
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

  const totalTasks = project.phases.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = project.phases.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.done).length,
    0
  );
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  function togglePhase(phaseId: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }

  function toggleNotes(taskId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
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
    const order: TaskPriority[] = ["none", "low", "medium", "high"];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    editTask(taskId, { priority: order[nextIdx] });
  }

  async function handleDelete() {
    if (!project) return;
    await removeProject(project.id);
    window.location.href = "/proyectos";
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

      {/* Project header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {project.logo_url ? (
            <img
              src={project.logo_url}
              alt=""
              className="h-12 w-12 flex-shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(196,112,74,0.1)" }}
            >
              <ProjectIcon icon={project.icon} size={24} className="text-accent" />
            </div>
          )}
          <div>
            <h1 className="font-heading text-2xl text-foreground">{project.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={project.status}
                color={projectStatuses.find((s) => s.name === project.status)?.color}
              />
              <span className="text-xs text-text-tertiary">{project.type}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openModal("export-project")}>
            <Download size={14} strokeWidth={2} />
            Exportar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openModal("edit-project")}>
            <Edit3 size={14} strokeWidth={2} />
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} strokeWidth={2} />
          </Button>
        </div>
      </div>

      {/* Stack */}
      {project.stack.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="rounded-md bg-sand px-2 py-0.5 text-[10px] font-medium text-text-secondary"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* View tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
        {(["progress", "diagram", "flow"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setViewTab(tab)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewTab === tab
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            {tab === "progress" ? "Progreso" : tab === "diagram" ? "Diagrama" : "Flujo"}
          </button>
        ))}
      </div>

      {/* Overall progress */}
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
                  editingPhaseId={editingPhaseId}
                  editingPhaseName={editingPhaseName}
                  editingTaskId={editingTaskId}
                  editingTaskText={editingTaskText}
                  expandedNotes={expandedNotes}
                  newTaskText={newTaskText[phase.id] ?? ""}
                  sensors={sensors}
                  onTogglePhase={togglePhase}
                  onCycleStatus={cyclePhaseStatus}
                  onDeletePhase={(id, name) => setDeletePhaseTarget({ id, name })}
                  onStartEditPhase={handleStartEditPhase}
                  onEditPhaseNameChange={setEditingPhaseName}
                  onSaveEditPhase={handleSaveEditPhase}
                  onCancelEditPhase={() => setEditingPhaseId(null)}
                  onToggleNotes={toggleNotes}
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

      {/* Diagram view */}
      {viewTab === "diagram" && <PhaseDiagram phases={project.phases} />}

      {/* Flow view */}
      {viewTab === "flow" && <PhaseFlowGraph phases={project.phases} />}

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

      {/* Edit modal */}
      <ProjectModal
        userId={userId}
        editProject={project}
        projectTypes={projectTypes}
        projectStatuses={projectStatuses}
        onTypesChange={setProjectTypes}
        onStatusesChange={setProjectStatuses}
      />

      {/* Export modal */}
      <ExportModal project={project} />
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
  editingPhaseId: string | null;
  editingPhaseName: string;
  editingTaskId: string | null;
  editingTaskText: string;
  expandedNotes: Set<string>;
  newTaskText: string;
  sensors: ReturnType<typeof useSensors>;
  onTogglePhase: (id: string) => void;
  onCycleStatus: (id: string, status: import("@/types/projects").PhaseStatus) => void;
  onDeletePhase: (id: string, name: string) => void;
  onStartEditPhase: (id: string, name: string) => void;
  onEditPhaseNameChange: (name: string) => void;
  onSaveEditPhase: () => void;
  onCancelEditPhase: () => void;
  onToggleNotes: (id: string) => void;
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
}

function SortablePhaseItem({
  phase,
  idx,
  totalPhases,
  isExpanded,
  isMobile,
  editingPhaseId,
  editingPhaseName,
  editingTaskId,
  editingTaskText,
  expandedNotes,
  newTaskText,
  sensors,
  onTogglePhase,
  onCycleStatus,
  onDeletePhase,
  onStartEditPhase,
  onEditPhaseNameChange,
  onSaveEditPhase,
  onCancelEditPhase,
  onToggleNotes,
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

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-border bg-card transition-[transform,box-shadow] duration-150 ease-out hover:translate-x-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
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
                  <SortableTaskItem
                    task={task}
                    taskIdx={taskIdx}
                    totalTasks={phase.tasks.length}
                    isMobile={isMobile}
                    isEditing={editingTaskId === task.id}
                    editingText={editingTaskText}
                    notesOpen={expandedNotes.has(task.id)}
                    onToggleDone={() => onEditTask(task.id, { done: !task.done })}
                    onStartEdit={() => onStartEditTask(task.id, task.text)}
                    onEditTextChange={onEditTaskTextChange}
                    onSaveEdit={onSaveEditTask}
                    onCancelEdit={onCancelEditTask}
                    onToggleNotes={() => onToggleNotes(task.id)}
                    onCyclePriority={() => onCyclePriority(task.id, task.priority)}
                    onDelete={() => onDeleteTask(task.id, task.text)}
                    debouncedEditTask={debouncedEditTask}
                    onMoveTask={(dir) => onMoveTask(taskIdx, dir)}
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

// ─── Phase Diagram (SVG) ──────────────

function PhaseDiagram({ phases }: { phases: PhaseListProps }) {
  if (phases.length === 0) return null;

  const nodeWidth = 160;
  const nodeHeight = 50;
  const gapX = 40;
  const totalWidth = phases.length * (nodeWidth + gapX) - gapX;
  const svgHeight = 120;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card p-5">
      <svg
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        className="h-auto w-full"
        style={{ minWidth: totalWidth }}
      >
        {phases.map((phase, i) => {
          const x = i * (nodeWidth + gapX);
          const y = 30;
          const config = PHASE_STATUS_CONFIG[phase.status];

          return (
            <g key={phase.id}>
              {i < phases.length - 1 && (
                <>
                  <line
                    x1={x + nodeWidth}
                    y1={y + nodeHeight / 2}
                    x2={x + nodeWidth + gapX - 8}
                    y2={y + nodeHeight / 2}
                    stroke="#E2D9CA"
                    strokeWidth={1.5}
                  />
                  <polygon
                    points={`${x + nodeWidth + gapX - 8},${y + nodeHeight / 2 - 4} ${
                      x + nodeWidth + gapX
                    },${y + nodeHeight / 2} ${x + nodeWidth + gapX - 8},${
                      y + nodeHeight / 2 + 4
                    }`}
                    fill="#E2D9CA"
                  />
                </>
              )}
              <rect
                x={x} y={y} width={nodeWidth} height={nodeHeight} rx={8}
                fill={`${config.color}14`} stroke={config.color} strokeWidth={1.5}
              />
              <circle cx={x + 16} cy={y + nodeHeight / 2} r={4} fill={config.color}>
                {phase.status === "in-progress" && (
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                )}
              </circle>
              <text
                x={x + 28} y={y + nodeHeight / 2 + 1} fill="#1A1714" fontSize={11}
                fontFamily="Plus Jakarta Sans, sans-serif" dominantBaseline="middle"
              >
                {phase.name.length > 14 ? phase.name.slice(0, 14) + "..." : phase.name}
              </text>
              <text
                x={x + nodeWidth - 12} y={y + nodeHeight / 2 + 1} fill="#888780" fontSize={9}
                fontFamily="JetBrains Mono, monospace" textAnchor="end" dominantBaseline="middle"
              >
                {phase.tasks.filter((t) => t.done).length}/{phase.tasks.length}
              </text>
            </g>
          );
        })}
        {[
          { color: "#5B8C6A", label: "Completada" },
          { color: "#C4704A", label: "En progreso" },
          { color: "#888780", label: "Pendiente" },
        ].map((item, i) => (
          <g key={item.label}>
            <circle cx={10 + i * 100} cy={12} r={4} fill={item.color} />
            <text
              x={20 + i * 100} y={12} fill="#888780" fontSize={9}
              fontFamily="Plus Jakarta Sans, sans-serif" dominantBaseline="middle"
            >
              {item.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Phase Flow Graph (SVG) ───────────

function PhaseFlowGraph({ phases }: { phases: PhaseListProps }) {
  if (phases.length === 0) return null;

  const nodeW = 200;
  const nodeH = 40;
  const taskH = 28;
  const padding = 20;
  const gapY = 20;

  let currentY = padding;
  const nodePositions = phases.map((phase) => {
    const y = currentY;
    const taskCount = phase.tasks.length;
    const totalHeight = nodeH + (taskCount > 0 ? taskCount * taskH + 8 : 0);
    currentY += totalHeight + gapY;
    return { y, totalHeight };
  });

  const svgHeight = currentY;
  const svgWidth = nodeW + padding * 2;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card p-5">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-auto w-full">
        {phases.map((phase, i) => {
          const x = padding;
          const y = nodePositions[i].y;
          const config = PHASE_STATUS_CONFIG[phase.status];

          return (
            <g key={phase.id}>
              {i < phases.length - 1 && (
                <line
                  x1={x + nodeW / 2} y1={y + nodePositions[i].totalHeight}
                  x2={x + nodeW / 2} y2={nodePositions[i + 1].y}
                  stroke="#E2D9CA" strokeWidth={1.5} strokeDasharray="4,4"
                />
              )}
              <rect
                x={x} y={y} width={nodeW} height={nodeH} rx={8}
                fill={`${config.color}14`} stroke={config.color} strokeWidth={1.5}
              />
              <circle cx={x + 16} cy={y + nodeH / 2} r={4} fill={config.color}>
                {phase.status === "in-progress" && (
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                )}
              </circle>
              <text
                x={x + 28} y={y + nodeH / 2} fill="#1A1714" fontSize={12}
                fontFamily="Plus Jakarta Sans, sans-serif" fontWeight={500} dominantBaseline="middle"
              >
                {phase.name}
              </text>
              {phase.tasks.map((task, ti) => {
                const taskY = y + nodeH + 4 + ti * taskH;
                return (
                  <g key={task.id}>
                    <rect
                      x={x + 16} y={taskY} width={nodeW - 32} height={taskH - 4} rx={4}
                      fill={task.done ? "#5B8C6A14" : "#FAF7F2"}
                      stroke={task.done ? "#5B8C6A" : "#E2D9CA"} strokeWidth={1}
                    />
                    <text
                      x={x + 28} y={taskY + (taskH - 4) / 2}
                      fill={task.done ? "#5B8C6A" : "#3D3630"} fontSize={10}
                      fontFamily="Plus Jakarta Sans, sans-serif" dominantBaseline="middle"
                    >
                      {task.done ? "\u2713 " : ""}
                      {task.text.length > 22 ? task.text.slice(0, 22) + "..." : task.text}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Types helper ─────────────────────

type PhaseListProps = import("@/types/projects").ProjectPhase[];

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
