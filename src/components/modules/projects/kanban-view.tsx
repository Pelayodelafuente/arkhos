'use client';

import { useState } from 'react';
import {
  DndContext,
  useDroppable,
  useDraggable,
  DragEndEvent,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { GripVertical, CheckSquare, Calendar } from 'lucide-react';
import { useProjectsStore } from '@/stores/projects-store';
import {
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  type ProjectPhase,
  type PhaseTask,
  type TaskStatus,
} from '@/types/projects';

// ─── Helpers ────────────────────────────

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

// ─── Column config ──────────────────────

interface ColumnDef {
  status: TaskStatus;
  label: string;
  bg: string;
}

const COLUMNS: ColumnDef[] = [
  { status: 'todo', label: 'Pendiente', bg: 'bg-[#f7f1e8]' },
  { status: 'in_progress', label: 'En progreso', bg: 'bg-[#fdf5ee]' },
  { status: 'review', label: 'En revisión', bg: 'bg-[#f0e8d8]' },
  { status: 'done', label: 'Completada', bg: 'bg-[#eef5f4]' },
  { status: 'blocked', label: 'Bloqueada', bg: 'bg-[#f8f0f1]' },
];

// ─── Enriched task (with phase info) ────

interface KanbanTask extends PhaseTask {
  phaseName: string;
  phaseId: string;
}

// ─── Droppable Column ───────────────────

function KanbanColumn({
  column,
  tasks,
  activeId,
}: {
  column: ColumnDef;
  tasks: KanbanTask[];
  activeId: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.status });

  return (
    <div
      ref={setNodeRef}
      className={`${column.bg} min-w-[200px] flex-1 rounded-xl p-3 flex flex-col gap-2 transition-all duration-150 ${
        isOver ? 'ring-2 ring-dashed ring-[#C4704A]' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1 px-1">
        <h3 className="text-sm font-medium text-[--text-primary]">{column.label}</h3>
        <span className="text-xs font-mono text-[--text-tertiary]">{tasks.length}</span>
      </div>

      {/* Scrollable task list */}
      <div className="overflow-y-auto max-h-[60vh] flex flex-col gap-2 pr-1">
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} isDragOverlay={false} isBeingDragged={activeId === task.id} />
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-6 text-xs text-[--text-tertiary]">
            Sin tareas
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Draggable Card ─────────────────────

function DraggableCard({
  task,
  isDragOverlay,
  isBeingDragged,
}: {
  task: KanbanTask;
  isDragOverlay: boolean;
  isBeingDragged: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = isDragOverlay
    ? undefined
    : transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined;

  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority];
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      className={`bg-white rounded-xl p-3 border border-[--border-stone] transition-all duration-150 ${
        isBeingDragged ? 'opacity-30' : ''
      } ${isDragOverlay ? 'rotate-2 scale-105' : ''}`}
    >
      {/* Top row: drag handle + task name */}
      <div className="flex items-start gap-2">
        <button
          {...(isDragOverlay ? {} : listeners)}
          {...(isDragOverlay ? {} : attributes)}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-[--text-tertiary] hover:text-[--text-secondary] transition-all duration-150 shrink-0"
          aria-label="Arrastrar tarea"
        >
          <GripVertical size={14} />
        </button>
        <span className="text-sm font-medium text-[--text-primary] leading-snug flex-1">
          {task.text}
        </span>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-6">
        {/* Phase badge */}
        <span className="text-xs px-1.5 py-0.5 rounded-md bg-[--bg-sand] text-[--text-secondary] truncate max-w-[120px]">
          {task.phaseName}
        </span>

        {/* Priority badge */}
        {task.priority !== 'none' && (
          <span className="inline-flex items-center gap-1 text-xs">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                task.priority === 'urgent' ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: priorityConfig.color }}
            />
            <span style={{ color: priorityConfig.color }}>{priorityConfig.label}</span>
          </span>
        )}

        {/* Due date */}
        {task.due_date && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-mono ${
              isOverdue(task.due_date) ? 'text-[var(--error)]' : 'text-[--text-tertiary]'
            }`}
          >
            <Calendar size={11} />
            {formatShortDate(task.due_date)}
          </span>
        )}

        {/* Subtask progress */}
        {totalSubtasks > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-mono text-[--text-tertiary]">
            <CheckSquare size={11} />
            {completedSubtasks}/{totalSubtasks}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────

interface KanbanViewProps {
  phases: ProjectPhase[];
  projectId: string;
  userId: string;
}

export default function KanbanView({ phases, projectId: _projectId, userId: _userId }: KanbanViewProps) {
  const changeTaskStatus = useProjectsStore((s) => s.changeTaskStatus);
  const [activePhaseFilter, setActivePhaseFilter] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Flatten all tasks and enrich with phase info
  const allTasks: KanbanTask[] = phases.flatMap((phase) =>
    phase.tasks.map((task) => ({
      ...task,
      phaseName: phase.name,
      phaseId: phase.id,
    }))
  );

  // Apply phase filter
  const filteredTasks = activePhaseFilter
    ? allTasks.filter((t) => t.phaseId === activePhaseFilter)
    : allTasks;

  // Group by status
  const tasksByStatus: Record<TaskStatus, KanbanTask[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
    blocked: [],
  };

  for (const task of filteredTasks) {
    tasksByStatus[task.status].push(task);
  }

  // Find the currently dragged task for overlay
  const draggedTask = activeDragId ? allTasks.find((t) => t.id === activeDragId) : null;

  function handleDragStart(event: { active: { id: string | number } }) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const newStatus = String(over.id) as TaskStatus;

    // Only update if status actually changed
    const task = allTasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    changeTaskStatus(taskId, newStatus);
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Phase filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActivePhaseFilter(null)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
            activePhaseFilter === null
              ? 'bg-[#C4704A] text-white'
              : 'bg-[--bg-sand] text-[--text-secondary] hover:bg-[--border-stone]'
          }`}
        >
          Todas
        </button>
        {phases.map((phase) => (
          <button
            key={phase.id}
            onClick={() =>
              setActivePhaseFilter(activePhaseFilter === phase.id ? null : phase.id)
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
              activePhaseFilter === phase.id
                ? 'bg-[#C4704A] text-white'
                : 'bg-[--bg-sand] text-[--text-secondary] hover:bg-[--border-stone]'
            }`}
          >
            {phase.name}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              column={col}
              tasks={tasksByStatus[col.status]}
              activeId={activeDragId}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {draggedTask ? (
            <div className="w-[260px]">
              <DraggableCard task={draggedTask} isDragOverlay={true} isBeingDragged={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
