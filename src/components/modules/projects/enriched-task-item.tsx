"use client";

import { motion } from "framer-motion";
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
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectsStore } from "@/stores/projects-store";
import {
  TASK_PRIORITY_CONFIG,
  type PhaseTask,
  type TaskPriority,
} from "@/types/projects";
import { TagChip } from "./tag-chip";

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
  none: "#9a7a5a",
  low: "#9a6a28",
  medium: "#c4704a",
  high: "#c4704a",
  urgent: "var(--error)",
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
  onOpenSlideOver: () => void;
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
  onOpenSlideOver,
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

  const activeTimeEntry = useProjectsStore((s) => s.activeTimeEntry);

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
        <motion.button
          onClick={onToggleDone}
          whileTap={{ scale: 1.3 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${
            task.done
              ? "border-accent bg-accent"
              : "border-border hover:border-accent"
          }`}
        >
          {task.done && (
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
              className={`block cursor-text text-sm transition-all duration-300 ${
                task.done
                  ? "text-text-tertiary line-through opacity-60"
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
                  task.priority === "urgent" ? "animate-pulse-slow" : ""
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

            {/* Tags */}
            {(task.tags ?? []).map((tag) => (
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

          {/* Open slide-over */}
          <button
            onClick={onOpenSlideOver}
            className="text-text-tertiary opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
            title="Abrir detalle"
          >
            <Maximize2 size={12} strokeWidth={2} />
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

    </div>
  );
}
