"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  BookOpen,
  ExternalLink,
  Clock,
  CheckSquare,
  Play,
  Square,
  Calendar,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useProjectsStore } from "@/stores/projects-store";
import {
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_PRIORITIES,
  type PhaseTask,
  type TaskPriority,
  type TaskStatus,
  type Subtask,
} from "@/types/projects";

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

// ─── Priority colors ────────────────

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  none: "#888780",
  low: "#5b8c6a",
  medium: "#9b7a4a",
  high: "#c4704a",
  urgent: "#b94444",
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
  projectId,
  userId,
  onToggleDone,
  onStartEdit,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onCyclePriority,
  onDelete,
  debouncedEditTask,
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

  const [expanded, setExpanded] = useState(false);
  const editTask = useProjectsStore((s) => s.editTask);
  const activeTimeEntry = useProjectsStore((s) => s.activeTimeEntry);
  const startTimer = useProjectsStore((s) => s.startTimer);
  const stopTimer = useProjectsStore((s) => s.stopTimer);
  const updateSubtasks = useProjectsStore((s) => s.updateSubtasks);

  const isTimerRunning = activeTimeEntry?.taskId === task.id;
  const subtasksDone = task.subtasks.filter((s) => s.completed).length;
  const hasSubtasks = task.subtasks.length > 0;

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
        <button
          onClick={onToggleDone}
          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${
            task.done
              ? "scale-100 border-accent bg-accent"
              : "border-border hover:border-accent"
          }`}
        >
          {task.done && (
            <Check size={10} strokeWidth={3} className="text-white" />
          )}
        </button>

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
              className={`block cursor-text text-sm transition-all duration-300 ${
                task.done
                  ? "text-text-tertiary line-through opacity-50"
                  : "text-foreground"
              }`}
              onClick={onStartEdit}
            >
              {task.text}
            </span>
          )}

          {/* Meta row */}
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {/* Priority badge */}
            {task.priority !== "none" && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  task.priority === "urgent" ? "animate-pulse" : ""
                }`}
                style={{
                  backgroundColor: `${PRIORITY_COLORS[task.priority]}14`,
                  color: PRIORITY_COLORS[task.priority],
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                />
                {TASK_PRIORITY_CONFIG[task.priority].label}
              </span>
            )}

            {/* Due date */}
            {task.due_date && (
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] ${
                  isOverdue(task.due_date) && !task.done
                    ? "font-medium text-red-500"
                    : "text-text-tertiary"
                }`}
              >
                <Calendar size={10} strokeWidth={2} />
                {formatDate(task.due_date)}
              </span>
            )}

            {/* Labels */}
            {task.labels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-sand px-1.5 py-0.5 text-[10px] text-text-secondary"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right-side indicators */}
        <div className="flex items-center gap-1.5">
          {/* Subtasks count */}
          {hasSubtasks && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-text-tertiary">
              <CheckSquare size={10} strokeWidth={2} />
              {subtasksDone}/{task.subtasks.length}
            </span>
          )}

          {/* Tracked time */}
          {task.tracked_seconds > 0 && (
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-text-tertiary">
              <Clock size={10} strokeWidth={2} />
              {formatDuration(task.tracked_seconds)}
            </span>
          )}

          {/* Timer indicator */}
          {isTimerRunning && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          )}

          {/* Expand/collapse */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-text-tertiary opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
          >
            <ChevronDown
              size={13}
              strokeWidth={2}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          {/* Notes indicator */}
          {!!task.content && (
            <span className="text-accent">
              <BookOpen size={11} strokeWidth={1.75} />
            </span>
          )}

          {/* Priority dot (clickable cycle) */}
          <button
            onClick={onCyclePriority}
            className="mt-0.5 h-2 w-2 rounded-full transition-transform hover:scale-150"
            style={{
              backgroundColor: PRIORITY_COLORS[task.priority],
            }}
            title={TASK_PRIORITY_CONFIG[task.priority].label}
          />

          {/* Links */}
          {task.links.length > 0 && (
            <div className="flex items-center gap-0.5">
              {task.links.map((link) => (
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

          {/* Delete */}
          <button
            onClick={onDelete}
            className="text-text-tertiary opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Expanded detail panel ────── */}
      <AnimatePresence>
        {expanded && (
          <ExpandedTaskPanel
            task={task}
            projectId={projectId}
            userId={userId}
            editTask={editTask}
            startTimer={startTimer}
            stopTimer={stopTimer}
            updateSubtasks={updateSubtasks}
            isTimerRunning={isTimerRunning}
            debouncedEditTask={debouncedEditTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Expanded panel ──────────────────

interface ExpandedTaskPanelProps {
  task: PhaseTask;
  projectId: string;
  userId: string;
  editTask: (taskId: string, input: Record<string, unknown>) => Promise<void>;
  startTimer: (taskId: string) => void;
  stopTimer: (projectId: string, userId: string) => Promise<void>;
  updateSubtasks: (taskId: string, subtasks: Subtask[]) => Promise<void>;
  isTimerRunning: boolean;
  debouncedEditTask: (taskId: string, content: string) => void;
}

function ExpandedTaskPanel({
  task,
  projectId,
  userId,
  editTask,
  startTimer,
  stopTimer,
  updateSubtasks,
  isTimerRunning,
  debouncedEditTask,
}: ExpandedTaskPanelProps) {
  // Local state for description
  const [description, setDescription] = useState(task.description || "");
  const descTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Timer display
  const [elapsed, setElapsed] = useState(0);
  const activeTimeEntry = useProjectsStore((s) => s.activeTimeEntry);

  useEffect(() => {
    if (!isTimerRunning || !activeTimeEntry) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - activeTimeEntry.startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, activeTimeEntry]);

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value);
      clearTimeout(descTimerRef.current);
      descTimerRef.current = setTimeout(() => {
        editTask(task.id, { description: value });
      }, 800);
    },
    [task.id, editTask]
  );

  // Subtask state
  const [newSubtaskText, setNewSubtaskText] = useState("");

  function addSubtask() {
    if (!newSubtaskText.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtaskText.trim(),
      completed: false,
    };
    updateSubtasks(task.id, [...task.subtasks, newSub]);
    setNewSubtaskText("");
  }

  function toggleSubtask(subId: string) {
    updateSubtasks(
      task.id,
      task.subtasks.map((s) =>
        s.id === subId ? { ...s, completed: !s.completed } : s
      )
    );
  }

  function removeSubtask(subId: string) {
    updateSubtasks(
      task.id,
      task.subtasks.filter((s) => s.id !== subId)
    );
  }

  const subtasksDone = task.subtasks.filter((s) => s.completed).length;
  const subtasksProgress =
    task.subtasks.length > 0
      ? Math.round((subtasksDone / task.subtasks.length) * 100)
      : 0;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="ml-8 space-y-4 rounded-lg border border-border bg-sand/20 p-3">
        {/* Description */}
        <div>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Añade una descripción..."
            className="w-full resize-y rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            rows={2}
          />
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Priority pills */}
          <div className="flex items-center gap-1">
            {TASK_PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => editTask(task.id, { priority: p })}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                  task.priority === p
                    ? "text-white"
                    : "bg-sand text-text-secondary hover:bg-border"
                }`}
                style={
                  task.priority === p
                    ? { backgroundColor: PRIORITY_COLORS[p] }
                    : undefined
                }
              >
                {TASK_PRIORITY_CONFIG[p].label}
              </button>
            ))}
          </div>

          {/* Start date */}
          <label className="inline-flex items-center gap-1 text-[10px] text-text-tertiary">
            <Calendar size={10} />
            Inicio
            <input
              type="date"
              value={task.start_date || ""}
              onChange={(e) =>
                editTask(task.id, {
                  start_date: e.target.value || null,
                })
              }
              className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-foreground focus:border-accent focus:outline-none"
            />
          </label>

          {/* Due date */}
          <label className="inline-flex items-center gap-1 text-[10px] text-text-tertiary">
            <AlertCircle size={10} />
            Límite
            <input
              type="date"
              value={task.due_date || ""}
              onChange={(e) =>
                editTask(task.id, {
                  due_date: e.target.value || null,
                })
              }
              className={`rounded border bg-card px-1.5 py-0.5 text-[10px] focus:border-accent focus:outline-none ${
                task.due_date && isOverdue(task.due_date) && !task.done
                  ? "border-red-300 text-red-500"
                  : "border-border text-foreground"
              }`}
            />
          </label>

          {/* Estimated hours */}
          <label className="inline-flex items-center gap-1 text-[10px] text-text-tertiary">
            <Clock size={10} />
            Estimado
            <input
              type="number"
              min={0}
              step={0.5}
              value={task.estimated_hours || ""}
              onChange={(e) =>
                editTask(task.id, {
                  estimated_hours: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0"
              className="w-14 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-foreground focus:border-accent focus:outline-none"
            />
            h
          </label>
        </div>

        {/* Labels */}
        <LabelsEditor
          labels={task.labels}
          onChange={(labels) => editTask(task.id, { labels })}
        />

        {/* Subtasks */}
        <div className="space-y-1.5">
          {task.subtasks.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-border">
                <div
                  className="h-1 rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${subtasksProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-text-tertiary">
                {subtasksDone} de {task.subtasks.length} completadas
              </span>
            </div>
          )}

          {task.subtasks.map((sub) => (
            <div
              key={sub.id}
              className="group/sub flex items-center gap-2"
            >
              <button
                onClick={() => toggleSubtask(sub.id)}
                className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                  sub.completed
                    ? "border-accent bg-accent"
                    : "border-border hover:border-accent"
                }`}
              >
                {sub.completed && (
                  <Check size={8} strokeWidth={3} className="text-white" />
                )}
              </button>
              <span
                className={`flex-1 text-xs ${
                  sub.completed
                    ? "text-text-tertiary line-through"
                    : "text-foreground"
                }`}
              >
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

          {/* Add subtask */}
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
              className="flex-1 rounded border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
            <button
              onClick={addSubtask}
              className="text-text-tertiary transition-colors hover:text-accent"
            >
              <Plus size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Time tracking */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isTimerRunning) {
                stopTimer(projectId, userId);
              } else {
                startTimer(task.id);
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isTimerRunning
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-sand text-text-secondary hover:bg-border"
            }`}
          >
            {isTimerRunning ? (
              <>
                <Square size={12} strokeWidth={2} />
                Detener
              </>
            ) : (
              <>
                <Play size={12} strokeWidth={2} />
                Iniciar cronómetro
              </>
            )}
          </button>

          {isTimerRunning && (
            <span className="font-mono text-sm text-red-500">
              {Math.floor(elapsed / 60)
                .toString()
                .padStart(2, "0")}
              :{(elapsed % 60).toString().padStart(2, "0")}
            </span>
          )}

          {task.tracked_seconds > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-xs text-text-tertiary">
              <Clock size={12} strokeWidth={1.75} />
              Total: {formatDuration(task.tracked_seconds)}
            </span>
          )}
        </div>

        {/* Notes / Content */}
        <div>
          <textarea
            value={task.content || ""}
            onChange={(e) => debouncedEditTask(task.id, e.target.value)}
            placeholder="Apuntes..."
            className="w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            rows={3}
          />
        </div>

        {/* Task links */}
        {task.links.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-text-tertiary">
              Enlaces
            </span>
            {task.links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-accent transition-colors hover:underline"
              >
                <ExternalLink size={11} strokeWidth={2} />
                {link.label || link.url}
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Labels Editor ──────────────────

function LabelsEditor({
  labels,
  onChange,
}: {
  labels: string[];
  onChange: (labels: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addLabel() {
    const value = input.trim();
    if (!value || labels.includes(value)) return;
    onChange([...labels, value]);
    setInput("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[10px] text-text-secondary"
        >
          {label}
          <button
            onClick={() => onChange(labels.filter((l) => l !== label))}
            className="text-text-tertiary hover:text-red-500"
          >
            <X size={8} strokeWidth={2} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addLabel();
          }
        }}
        placeholder="Etiqueta + Enter"
        className="w-24 rounded border-none bg-transparent px-1 py-0.5 text-[10px] text-foreground placeholder:text-text-tertiary focus:outline-none"
      />
    </div>
  );
}
