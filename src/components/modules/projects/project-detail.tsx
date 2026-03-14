"use client";

import { useEffect, useState } from "react";
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
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button, Progress, Modal, Skeleton } from "@/components/ui";
import { useProjectsStore } from "@/stores/projects-store";
import { useUIStore } from "@/stores/ui-store";
import { ProjectIcon } from "./project-icon";
import { StatusBadge } from "./status-badge";
import { ProjectModal } from "./project-modal";
import { ExportModal } from "./export-modal";
import {
  PHASE_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  type PhaseStatus,
  type TaskPriority,
} from "@/types/projects";

interface ProjectDetailProps {
  projectId: string;
  userId: string;
}

export function ProjectDetail({ projectId, userId }: ProjectDetailProps) {
  const project = useProjectsStore((s) => s.activeProject);
  const loading = useProjectsStore((s) => s.loading);
  const fetchProject = useProjectsStore((s) => s.fetchProject);
  const removeProject = useProjectsStore((s) => s.removeProject);
  const editPhase = useProjectsStore((s) => s.editPhase);
  const addTask = useProjectsStore((s) => s.addTask);
  const editTask = useProjectsStore((s) => s.editTask);
  const removeTask = useProjectsStore((s) => s.removeTask);
  const clearActiveProject = useProjectsStore((s) => s.clearActiveProject);
  const openModal = useUIStore((s) => s.openModal);

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewTab, setViewTab] = useState<"progress" | "diagram" | "flow">("progress");

  useEffect(() => {
    fetchProject(projectId);
    return () => clearActiveProject();
  }, [projectId, fetchProject, clearActiveProject]);

  // Auto-expand in-progress phases
  useEffect(() => {
    if (project) {
      const inProgress = project.phases
        .filter((p) => p.status === "in-progress")
        .map((p) => p.id);
      setExpandedPhases(new Set(inProgress));
    }
  }, [project?.id]);

  if (loading && !project) {
    return <DetailSkeleton />;
  }

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

  function cyclePhaseStatus(phaseId: string, current: PhaseStatus) {
    const order: PhaseStatus[] = ["pending", "in-progress", "done"];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    editPhase(phaseId, { status: order[nextIdx] });
  }

  function handleAddTask(phaseId: string) {
    const text = newTaskText[phaseId]?.trim();
    if (!text) return;
    addTask({ phase_id: phaseId, text });
    setNewTaskText((prev) => ({ ...prev, [phaseId]: "" }));
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
    <div>
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
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(196,112,74,0.1)" }}
          >
            <ProjectIcon icon={project.icon} size={24} className="text-accent" />
          </div>
          <div>
            <h1 className="font-heading text-2xl text-foreground">{project.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              <span className="text-xs text-text-tertiary">{project.type}</span>
              {project.start_date && (
                <span className="font-mono text-xs text-text-tertiary">
                  {new Date(project.start_date).toLocaleDateString("es-ES")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal("export-project")}
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openModal("edit-project")}
          >
            <Edit3 size={14} strokeWidth={2} />
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} strokeWidth={2} />
          </Button>
        </div>
      </div>

      {/* Stack + Tags */}
      {(project.stack.length > 0 || project.tags.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="rounded-md bg-sand px-2 py-0.5 text-[10px] font-medium text-text-secondary"
            >
              {tech}
            </span>
          ))}
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-[10px] text-text-secondary"
            >
              {tag}
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

      {/* Phases timeline */}
      {viewTab === "progress" && (
        <div className="space-y-3">
          {project.phases.map((phase, idx) => {
            const isExpanded = expandedPhases.has(phase.id);
            const phaseDoneTasks = phase.tasks.filter((t) => t.done).length;
            const phaseProgress =
              phase.tasks.length > 0
                ? Math.round((phaseDoneTasks / phase.tasks.length) * 100)
                : 0;
            const statusConfig = PHASE_STATUS_CONFIG[phase.status];

            return (
              <div
                key={phase.id}
                className="rounded-xl border border-border bg-card"
              >
                {/* Phase header */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-sand/30"
                >
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
                    {idx < project.phases.length - 1 && (
                      <span className="mt-1 h-4 w-px bg-border" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
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
                    {phase.tasks.length > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        <Progress value={phaseProgress} className="w-24" />
                        <span className="font-mono text-[10px] text-text-tertiary">
                          {phaseDoneTasks}/{phase.tasks.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status cycle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cyclePhaseStatus(phase.id, phase.status);
                    }}
                    className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-sand hover:text-foreground"
                    title="Cambiar estado"
                  >
                    <span
                      className="block h-4 w-4 rounded-full border-2"
                      style={{ borderColor: statusConfig.color }}
                    />
                  </button>

                  {isExpanded ? (
                    <ChevronDown size={16} className="text-text-tertiary" />
                  ) : (
                    <ChevronRight size={16} className="text-text-tertiary" />
                  )}
                </button>

                {/* Phase body (expanded) */}
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    {/* Notes */}
                    {phase.notes && (
                      <div className="mb-3 rounded-lg bg-sand/40 p-3">
                        <p className="whitespace-pre-wrap font-mono text-xs text-text-secondary">
                          {phase.notes}
                        </p>
                      </div>
                    )}

                    {/* Notes edit */}
                    <textarea
                      value={phase.notes}
                      onChange={(e) => editPhase(phase.id, { notes: e.target.value })}
                      placeholder="Notas de fase..."
                      rows={2}
                      className="mb-3 w-full resize-y rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-text-secondary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />

                    {/* Tasks */}
                    <div className="space-y-1.5">
                      {phase.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sand/30"
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => editTask(task.id, { done: !task.done })}
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

                          {/* Task text */}
                          <span
                            className={`flex-1 text-sm ${
                              task.done
                                ? "text-text-tertiary line-through"
                                : "text-foreground"
                            }`}
                          >
                            {task.text}
                          </span>

                          {/* Priority dot */}
                          {task.priority !== "none" && (
                            <button
                              onClick={() => cyclePriority(task.id, task.priority)}
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

                          {/* Delete task (on hover) */}
                          <button
                            onClick={() => removeTask(task.id)}
                            className="text-text-tertiary opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                          >
                            <Trash2 size={12} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add task */}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={newTaskText[phase.id] ?? ""}
                        onChange={(e) =>
                          setNewTaskText((prev) => ({
                            ...prev,
                            [phase.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTask(phase.id);
                        }}
                        placeholder="Nueva tarea..."
                        className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddTask(phase.id)}
                      >
                        <Plus size={14} strokeWidth={2} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Diagram view */}
      {viewTab === "diagram" && <PhaseDiagram phases={project.phases} />}

      {/* Flow view */}
      {viewTab === "flow" && <PhaseFlowGraph phases={project.phases} />}

      {/* Delete confirmation */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar proyecto">
        <p className="mb-4 text-sm text-text-secondary">
          Se eliminara el proyecto <strong>{project.name}</strong> y todos sus datos. Esta accion no
          se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            Eliminar
          </Button>
        </div>
      </Modal>

      {/* Edit modal */}
      <ProjectModal userId={userId} editProject={project} />

      {/* Export modal */}
      <ExportModal project={project} />
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
              {/* Connector arrow */}
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

              {/* Node */}
              <rect
                x={x}
                y={y}
                width={nodeWidth}
                height={nodeHeight}
                rx={8}
                fill={`${config.color}14`}
                stroke={config.color}
                strokeWidth={1.5}
              />

              {/* Status dot */}
              <circle
                cx={x + 16}
                cy={y + nodeHeight / 2}
                r={4}
                fill={config.color}
              >
                {phase.status === "in-progress" && (
                  <animate
                    attributeName="opacity"
                    values="1;0.3;1"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>

              {/* Name */}
              <text
                x={x + 28}
                y={y + nodeHeight / 2 + 1}
                fill="#1A1714"
                fontSize={11}
                fontFamily="Plus Jakarta Sans, sans-serif"
                dominantBaseline="middle"
              >
                {phase.name.length > 14
                  ? phase.name.slice(0, 14) + "..."
                  : phase.name}
              </text>

              {/* Task count */}
              <text
                x={x + nodeWidth - 12}
                y={y + nodeHeight / 2 + 1}
                fill="#888780"
                fontSize={9}
                fontFamily="JetBrains Mono, monospace"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {phase.tasks.filter((t) => t.done).length}/{phase.tasks.length}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        {[
          { color: "#5B8C6A", label: "Completada" },
          { color: "#C4704A", label: "En progreso" },
          { color: "#888780", label: "Pendiente" },
        ].map((item, i) => (
          <g key={item.label}>
            <circle cx={10 + i * 100} cy={12} r={4} fill={item.color} />
            <text
              x={20 + i * 100}
              y={12}
              fill="#888780"
              fontSize={9}
              fontFamily="Plus Jakarta Sans, sans-serif"
              dominantBaseline="middle"
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

  // Calculate total height
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
              {/* Connector to next */}
              {i < phases.length - 1 && (
                <line
                  x1={x + nodeW / 2}
                  y1={y + nodePositions[i].totalHeight}
                  x2={x + nodeW / 2}
                  y2={nodePositions[i + 1].y}
                  stroke="#E2D9CA"
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                />
              )}

              {/* Phase node */}
              <rect
                x={x}
                y={y}
                width={nodeW}
                height={nodeH}
                rx={8}
                fill={`${config.color}14`}
                stroke={config.color}
                strokeWidth={1.5}
              />
              <circle cx={x + 16} cy={y + nodeH / 2} r={4} fill={config.color}>
                {phase.status === "in-progress" && (
                  <animate
                    attributeName="opacity"
                    values="1;0.3;1"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              <text
                x={x + 28}
                y={y + nodeH / 2}
                fill="#1A1714"
                fontSize={12}
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight={500}
                dominantBaseline="middle"
              >
                {phase.name}
              </text>

              {/* Task sub-nodes */}
              {phase.tasks.map((task, ti) => {
                const taskY = y + nodeH + 4 + ti * taskH;
                return (
                  <g key={task.id}>
                    <rect
                      x={x + 16}
                      y={taskY}
                      width={nodeW - 32}
                      height={taskH - 4}
                      rx={4}
                      fill={task.done ? "#5B8C6A14" : "#FAF7F2"}
                      stroke={task.done ? "#5B8C6A" : "#E2D9CA"}
                      strokeWidth={1}
                    />
                    <text
                      x={x + 28}
                      y={taskY + (taskH - 4) / 2}
                      fill={task.done ? "#5B8C6A" : "#3D3630"}
                      fontSize={10}
                      fontFamily="Plus Jakarta Sans, sans-serif"
                      dominantBaseline="middle"
                    >
                      {task.done ? "✓ " : ""}
                      {task.text.length > 22
                        ? task.text.slice(0, 22) + "..."
                        : task.text}
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
