'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckSquare, Calendar } from 'lucide-react';
import { TagChip } from './tag-chip';
import { useProjectsStore } from '@/stores/projects-store';
import {
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
  onOpenTask,
}: {
  column: ColumnDef;
  tasks: KanbanTask[];
  activeId: string | null;
  onOpenTask: (task: PhaseTask) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.status });

  // Calculate completion progress for this column
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

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
        <span className="text-xs font-mono text-[--text-tertiary]">{done}/{total}</span>
      </div>
      {/* Progress bar */}
      {total > 0 && (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: column.status === 'done' ? '#22C55E' : '#C4704A',
            }}
          />
        </div>
      )}

      {/* Scrollable task list */}
      <div className="overflow-y-auto max-h-[60vh] flex flex-col gap-3 pr-1">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              isDragOverlay={false}
              isBeingDragged={activeId === task.id}
              onOpenTask={onOpenTask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex min-h-[200px] items-center justify-center text-xs text-[--text-tertiary]">
            Sin tareas
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sortable Card ─────────────────────

function SortableCard({
  task,
  isDragOverlay,
  isBeingDragged,
  onOpenTask,
}: {
  task: KanbanTask;
  isDragOverlay: boolean;
  isBeingDragged: boolean;
  onOpenTask: (task: KanbanTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    data: { task },
    disabled: isDragOverlay,
  });

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority];
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      onClick={() => !isDragOverlay && onOpenTask(task)}
      className={`bg-white rounded-xl p-3 border border-[--border-stone] transition-all duration-150 cursor-pointer ${
        isBeingDragged ? 'opacity-0' : ''
      } ${isDragOverlay ? 'rotate-2 scale-105 shadow-lg' : ''}`}
    >
      {/* Top row: drag handle + task name */}
      <div className="flex items-start gap-2">
        <button
          {...(isDragOverlay ? {} : listeners)}
          {...(isDragOverlay ? {} : attributes)}
          onClick={(e) => e.stopPropagation()}
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
              className="w-2 h-2 rounded-full shrink-0"
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

        {/* Tags */}
        {(task.tags ?? []).length > 0 && (
          <>
            {(task.tags ?? []).map((tag) => (
              <TagChip key={tag.id} tag={tag} size="sm" />
            ))}
          </>
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
  onOpenTask: (task: PhaseTask) => void;
}

export default function KanbanView({
  phases,
  projectId: _projectId,
  userId: _userId,
  onOpenTask,
}: KanbanViewProps) {
  const changeTaskStatus = useProjectsStore((s) => s.changeTaskStatus);
  const reorderTasksAction = useProjectsStore((s) => s.reorderTasksAction);
  const activeProject = useProjectsStore((s) => s.activeProject);
  const [activePhaseFilter, setActivePhaseFilter] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<Record<TaskStatus, string[]>>({
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Flatten all tasks and enrich with phase info
  const allTasks = useMemo<KanbanTask[]>(
    () =>
      phases.flatMap((phase) =>
        phase.tasks.map((task) => ({
          ...task,
          phaseName: phase.name,
          phaseId: phase.id,
        }))
      ),
    [phases]
  );

  // Apply phase filter
  const filteredTasks = useMemo(
    () =>
      activePhaseFilter
        ? allTasks.filter((t) => t.phaseId === activePhaseFilter)
        : allTasks,
    [allTasks, activePhaseFilter]
  );

  // Group by status
  const tasksByStatus = useMemo(() => {
    const result: Record<TaskStatus, KanbanTask[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const task of filteredTasks) {
      result[task.status].push(task);
    }
    return result;
  }, [filteredTasks]);

  // Sync local order when tasks change from external source (e.g. after cross-column move)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalOrder((prev) => {
      const next = { ...prev };
      for (const col of COLUMNS) {
        const currentIds = tasksByStatus[col.status].map((t) => t.id);
        const prevIds = prev[col.status];
        if (prevIds.length === 0) {
          next[col.status] = currentIds;
        } else {
          // Maintain relative order, add new tasks at end, drop removed tasks
          const kept = prevIds.filter((id) => currentIds.includes(id));
          const added = currentIds.filter((id) => !prevIds.includes(id));
          next[col.status] = [...kept, ...added];
        }
      }
      return next;
    });
  }, [tasksByStatus]);

  // Get tasks in locally-sorted order for display
  const sortedTasksByStatus = useMemo(() => {
    const result: Record<TaskStatus, KanbanTask[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const col of COLUMNS) {
      const order = localOrder[col.status];
      const tasks = tasksByStatus[col.status];
      if (order.length === 0) {
        result[col.status] = tasks;
      } else {
        const ordered = order
          .map((id) => tasks.find((t) => t.id === id))
          .filter(Boolean) as KanbanTask[];
        const extras = tasks.filter((t) => !order.includes(t.id));
        result[col.status] = [...ordered, ...extras];
      }
    }
    return result;
  }, [tasksByStatus, localOrder]);

  // Find the currently dragged task for overlay
  const draggedTask = activeDragId ? allTasks.find((t) => t.id === activeDragId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Check if dropping on a column droppable (empty column area)
    const isColumnDrop = COLUMNS.some((c) => c.status === overId);

    if (isColumnDrop) {
      const newStatus = overId as TaskStatus;
      if (task.status !== newStatus) {
        changeTaskStatus(taskId, newStatus);
      }
    } else {
      // Dropping on another card
      const overTask = allTasks.find((t) => t.id === overId);
      if (!overTask) return;

      if (task.status !== overTask.status) {
        // Cross-column move — persist to DB
        changeTaskStatus(taskId, overTask.status);
      } else {
        // Same-column reorder — update local view AND persist to DB
        const status = task.status;
        const currentIds =
          localOrder[status].length > 0
            ? [...localOrder[status]]
            : tasksByStatus[status].map((t) => t.id);
        const oldIdx = currentIds.indexOf(taskId);
        const newIdx = currentIds.indexOf(overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          const newStatusIds = arrayMove(currentIds, oldIdx, newIdx);
          setLocalOrder((prev) => ({ ...prev, [status]: newStatusIds }));

          // Rebuild full phase task order and persist
          const phaseId = task.phase_id;
          const phaseTasks = activeProject?.phases.find((p) => p.id === phaseId)?.tasks ?? [];
          const sorted = [...phaseTasks].sort((a, b) => a.sort_order - b.sort_order);
          const statusIndices = sorted.map((t, i) => (t.status === status ? i : -1)).filter((i) => i >= 0);
          const newStatusTasks = newStatusIds.map((id) => sorted.find((t) => t.id === id)!).filter(Boolean);
          statusIndices.forEach((listIdx, orderIdx) => {
            if (newStatusTasks[orderIdx]) sorted[listIdx] = newStatusTasks[orderIdx];
          });
          reorderTasksAction(phaseId, sorted.map((t) => t.id));
        }
      }
    }
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  return (
    <div className={`flex flex-col gap-4${activeDragId ? ' select-none' : ''}`}>
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
        sensors={sensors}
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
              tasks={sortedTasksByStatus[col.status]}
              activeId={activeDragId}
              onOpenTask={onOpenTask}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {draggedTask ? (
            <div className="w-[260px]">
              <SortableCard
                task={draggedTask}
                isDragOverlay={true}
                isBeingDragged={false}
                onOpenTask={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
