"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  ExternalLink,
  Clock,
  CheckSquare,
  Calendar,
  Maximize2,
  Minimize2,
  Plus,
  X,
  MessageSquare,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectsStore } from "@/stores/projects-store";
import {
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_STATUSES,
  TASK_PRIORITIES,
  type PhaseTask,
  type TaskPriority,
  type Subtask,
} from "@/types/projects";
import { TagChip } from "./tag-chip";
import { TagSelector } from "./tag-selector";

// ─── Helpers ────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(date: string): string {
  const d = new Date(date);
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function isOverdue(date: string): boolean {
  return new Date(date) < new Date(new Date().toDateString());
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `hace ${days}d`;
  return formatDate(dateStr);
}

// ─── Priority colors ────────────────

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  none: "#888780",
  low: "#22C55E",
  medium: "#F59E0B",
  high: "#C4704A",
};

// ─── Props ──────────────────────────

interface EnrichedTaskItemProps {
  task: PhaseTask;
  taskIdx: number;
  totalTasks: number;
  isMobile: boolean;
  isEditing: boolean;
  editingText: string;
  projectId: string;
  userId: string;
  onToggleDone: () => void;
  onStartEdit: () => void;
  onEditTextChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onCyclePriority: () => void;
  onDelete: () => void;
  debouncedEditTask: (taskId: string, content: string) => void;
  onMoveTask: (direction: -1 | 1) => void;
}

export function EnrichedTaskItem({
  task,
  taskIdx,
  totalTasks,
  isMobile,
  isEditing,
  editingText,
  projectId: _projectId,
  userId: _userId,
  onToggleDone,
  onStartEdit,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onCyclePriority,
  onDelete,
  debouncedEditTask: _debouncedEditTask,
  onMoveTask,
}: EnrichedTaskItemProps) {
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

  // ─── Live task from store (fixes stale data bug) ───
  const liveTask = useProjectsStore((state) => {
    const project = state.activeProject;
    if (!project) return task;
    for (const phase of project.phases) {
      const found = phase.tasks.find((t) => t.id === task.id);
      if (found) return found;
    }
    return task;
  });

  const editTask = useProjectsStore((s) => s.editTask);
  const changeTaskStatus = useProjectsStore((s) => s.changeTaskStatus);
  const updateSubtasks = useProjectsStore((s) => s.updateSubtasks);
  const projectTags = useProjectsStore((s) => s.projectTags);
  const taskComments = useProjectsStore((s) => s.taskComments[task.id]);
  const loadTaskComments = useProjectsStore((s) => s.loadTaskComments);
  const addComment = useProjectsStore((s) => s.addComment);
  const deleteComment = useProjectsStore((s) => s.deleteComment);

  const [isExpanded, setIsExpanded] = useState(false);
  const [description, setDescription] = useState(liveTask.description || liveTask.content || "");
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const descTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const subtasksDone = liveTask.subtasks.filter((s) => s.completed).length;
  const hasSubtasks = liveTask.subtasks.length > 0;

  // Sync description from live task
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDescription(liveTask.description || liveTask.content || "");
  }, [liveTask.description, liveTask.content]);

  // Load comments when expanding
  useEffect(() => {
    if (isExpanded && !taskComments) {
      loadTaskComments(task.id);
    }
  }, [isExpanded, taskComments, loadTaskComments, task.id]);

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    clearTimeout(descTimerRef.current);
    descTimerRef.current = setTimeout(() => {
      editTask(task.id, { description: value, content: value });
    }, 500);
  }, [task.id, editTask]);

  function addSubtask() {
    if (!newSubtaskText.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtaskText.trim(),
      completed: false,
    };
    updateSubtasks(task.id, [...liveTask.subtasks, newSub]);
    setNewSubtaskText("");
  }

  function toggleSubtask(subId: string) {
    updateSubtasks(task.id, liveTask.subtasks.map((s) => s.id === subId ? { ...s, completed: !s.completed } : s));
  }

  function removeSubtask(subId: string) {
    updateSubtasks(task.id, liveTask.subtasks.filter((s) => s.id !== subId));
  }

  async function handleAddComment() {
    if (!newCommentText.trim()) return;
    await addComment(task.id, newCommentText.trim());
    setNewCommentText("");
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* ── Compact row ───────────────── */}
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
        <motion.button
          onClick={onToggleDone}
          whileTap={{ scale: 1.3 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${
            liveTask.done
              ? "border-accent bg-accent"
              : "border-border hover:border-accent"
          }`}
        >
          {liveTask.done && (
            <Check size={10} strokeWidth={3} className="text-white" />
          )}
        </motion.button>

        {/* Task name + meta row */}
        <div className="flex-1 min-w-0">
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
              className="w-full rounded-md border border-accent bg-card px-2 py-0.5 text-sm text-foreground focus:outline-none"
            />
          ) : (
            <span
              className={`block cursor-pointer text-sm transition-all duration-300 ${
                liveTask.done
                  ? "text-text-tertiary line-through opacity-60"
                  : "text-foreground"
              }`}
              onClick={() => setIsExpanded(!isExpanded)}
              onDoubleClick={onStartEdit}
              title={isExpanded ? "Colapsar detalle" : "Expandir detalle (doble click para editar)"}
            >
              {liveTask.text}
            </span>
          )}

          {/* Meta row */}
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {/* Priority badge */}
            {liveTask.priority !== "none" && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  ""
                }`}
                style={{
                  backgroundColor: `${PRIORITY_COLORS[liveTask.priority]}14`,
                  color: PRIORITY_COLORS[liveTask.priority],
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: PRIORITY_COLORS[liveTask.priority] }}
                />
                {TASK_PRIORITY_CONFIG[liveTask.priority].label}
              </span>
            )}

            {/* Due date */}
            {liveTask.due_date && (
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] ${
                  isOverdue(liveTask.due_date) && !liveTask.done
                    ? "font-medium text-red-500"
                    : "text-text-tertiary"
                }`}
              >
                <Calendar size={10} strokeWidth={2} />
                {formatDate(liveTask.due_date)}
              </span>
            )}

            {/* Labels */}
            {liveTask.labels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-sand px-1.5 py-0.5 text-[10px] text-text-secondary"
              >
                {label}
              </span>
            ))}

            {/* Tags */}
            {(liveTask.tags ?? []).map((tag) => (
              <TagChip key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        </div>

        {/* Right-side indicators */}
        <div className="flex items-center gap-1.5">
          {/* Subtasks count */}
          {hasSubtasks && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-text-tertiary">
              <CheckSquare size={10} strokeWidth={2} />
              {subtasksDone}/{liveTask.subtasks.length}
            </span>
          )}

          {/* Tracked time */}
          {liveTask.tracked_seconds > 0 && (
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-text-tertiary">
              <Clock size={10} strokeWidth={2} />
              {formatDuration(liveTask.tracked_seconds)}
            </span>
          )}


          {/* Priority dot (clickable cycle) */}
          <button
            onClick={onCyclePriority}
            className="mt-0.5 h-2 w-2 rounded-full transition-transform hover:scale-150"
            style={{
              backgroundColor: PRIORITY_COLORS[liveTask.priority],
            }}
            title={TASK_PRIORITY_CONFIG[liveTask.priority].label}
          />

          {/* Links */}
          {liveTask.links.length > 0 && (
            <div className="flex items-center gap-0.5">
              {liveTask.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary transition-colors hover:text-accent"
                  title={link.label || link.url}
                >
                  <ExternalLink size={11} strokeWidth={2} />
                </a>
              ))}
            </div>
          )}

          {/* Toggle inline expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`transition-colors hover:text-accent ${isExpanded ? "text-accent" : "text-text-tertiary"}`}
            title={isExpanded ? "Colapsar detalle" : "Expandir detalle"}
          >
            {isExpanded ? (
              <Minimize2 size={12} strokeWidth={2} />
            ) : (
              <Maximize2 size={12} strokeWidth={2} />
            )}
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="text-text-tertiary opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Inline expanded panel ───────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-8 mr-2 space-y-3 border-l-2 border-border pb-3 pl-4 pt-2">

              {/* Status pills */}
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Estado</p>
                <div className="flex flex-wrap gap-1">
                  {TASK_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeTaskStatus(task.id, s)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                        liveTask.status === s ? "text-white" : "bg-sand text-text-tertiary hover:bg-border"
                      }`}
                      style={liveTask.status === s ? { backgroundColor: TASK_STATUS_CONFIG[s].color } : undefined}
                    >
                      {TASK_STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority pills */}
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Prioridad</p>
                <div className="flex flex-wrap gap-1">
                  {TASK_PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => editTask(task.id, { priority: p })}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                        liveTask.priority === p ? "text-white" : "bg-sand text-text-secondary hover:bg-border"
                      }`}
                      style={liveTask.priority === p ? { backgroundColor: TASK_PRIORITY_CONFIG[p].color } : undefined}
                    >
                      {TASK_PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Inicio</span>
                  <input
                    type="date"
                    value={liveTask.start_date || ""}
                    onChange={(e) => editTask(task.id, { start_date: e.target.value || null })}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className={`text-[10px] font-medium uppercase tracking-wide ${
                    liveTask.due_date && isOverdue(liveTask.due_date) && !liveTask.done ? "text-red-500" : "text-text-tertiary"
                  }`}>Limite</span>
                  <input
                    type="date"
                    value={liveTask.due_date || ""}
                    onChange={(e) => editTask(task.id, { due_date: e.target.value || null })}
                    className={`rounded-md border bg-background px-2 py-1 text-xs focus:border-accent focus:outline-none ${
                      liveTask.due_date && isOverdue(liveTask.due_date) && !liveTask.done
                        ? "border-red-300 text-red-500"
                        : "border-border text-foreground"
                    }`}
                  />
                </label>
              </div>

              {/* Description */}
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Descripcion</p>
                <textarea
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Notas, descripcion, ideas..."
                  rows={3}
                  className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
              </div>

              {/* Subtasks */}
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  Subtareas {liveTask.subtasks.length > 0 && `(${subtasksDone}/${liveTask.subtasks.length})`}
                </p>
                <div className="space-y-1">
                  {liveTask.subtasks.map((sub) => (
                    <div key={sub.id} className="group/sub flex items-center gap-2">
                      <button
                        onClick={() => toggleSubtask(sub.id)}
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
                          sub.completed ? "border-accent bg-accent" : "border-border hover:border-accent"
                        }`}
                      >
                        {sub.completed && <Check size={8} strokeWidth={3} className="text-white" />}
                      </button>
                      <span className={`flex-1 text-xs ${sub.completed ? "text-text-tertiary line-through" : "text-foreground"}`}>
                        {sub.title}
                      </span>
                      <button
                        onClick={() => removeSubtask(sub.id)}
                        className="text-text-tertiary opacity-0 transition-opacity hover:text-red-500 group-hover/sub:opacity-100"
                      >
                        <X size={10} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addSubtask();
                        if (e.key === "Escape") setNewSubtaskText("");
                      }}
                      placeholder="Nueva subtarea..."
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />
                    <button onClick={addSubtask} className="text-text-tertiary transition-colors hover:text-accent">
                      <Plus size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {projectTags.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Tags</p>
                  <TagSelector taskId={task.id} selectedTags={liveTask.tags ?? []} />
                </div>
              )}

              {/* Comments / Notes section */}
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  <MessageSquare size={10} strokeWidth={2} />
                  Notas / Versiones
                </p>

                {/* Add comment input */}
                <div className="mb-2 flex items-start gap-2">
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Escribir una nota..."
                    rows={2}
                    className="flex-1 resize-none rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newCommentText.trim()}
                    className="shrink-0 rounded-md bg-accent px-2.5 py-1.5 text-[10px] font-medium text-white transition-opacity disabled:opacity-40"
                  >
                    Añadir
                  </button>
                </div>

                {/* Comments list */}
                {(taskComments ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    {(taskComments ?? []).map((comment) => (
                      <div
                        key={comment.id}
                        className="group/comment flex items-start gap-2 rounded-md border-l-2 border-border bg-sand/30 px-2.5 py-1.5"
                      >
                        {/* Avatar initial */}
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[9px] font-bold text-accent">
                          P
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground">
                            {comment.content}
                          </p>
                          <span className="mt-0.5 block text-[9px] text-text-tertiary">
                            {timeAgo(comment.created_at)}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteComment(task.id, comment.id)}
                          className="shrink-0 text-text-tertiary opacity-0 transition-opacity hover:text-red-500 group-hover/comment:opacity-100"
                          title="Eliminar nota"
                        >
                          <X size={10} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
