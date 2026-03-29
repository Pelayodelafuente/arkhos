'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import { ChevronRight, ChevronDown, Plus, AlertCircle } from 'lucide-react';
import { useProjectsStore } from '@/stores/projects-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { Badge, Progress } from '@/components/ui';
import KanbanView from '../kanban-view';
import { TaskSlideOver } from '../task-slide-over';
import {
  PHASE_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  PHASE_STATUSES,
  type ProjectPhase,
  type PhaseTask,
  type PhaseStatus,
} from '@/types/projects';

// ─── Constants ──────────────────────

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const PRIORITY_BADGE_VARIANT: Record<string, 'terracotta' | 'gold' | 'green' | 'gray'> = {
  high: 'terracotta',
  medium: 'gold',
  low: 'green',
  none: 'gray',
};

// ─── Helpers ────────────────────────

function isStale(task: PhaseTask): boolean {
  if (task.done) return false;
  const updatedAt = new Date(task.updated_at).getTime();
  return Date.now() - updatedAt > THREE_DAYS_MS;
}

function computeProgress(phases: ProjectPhase[]): number {
  const total = phases.reduce((sum, p) => sum + p.tasks.length, 0);
  if (total === 0) return 0;
  const done = phases.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.done).length,
    0
  );
  return Math.round((done / total) * 100);
}

function nextPhaseStatus(current: PhaseStatus): PhaseStatus {
  const idx = PHASE_STATUSES.indexOf(current);
  return PHASE_STATUSES[(idx + 1) % PHASE_STATUSES.length];
}

// ─── Task Row ───────────────────────

function TaskRow({ task, onOpen }: { task: PhaseTask; onOpen: (t: PhaseTask) => void }) {
  const editTask = useProjectsStore((s) => s.editTask);
  const stale = isStale(task);
  const priorityCfg = TASK_PRIORITY_CONFIG[task.priority];

  return (
    <div
      className="group flex items-center gap-[6px] rounded-md px-[6px] py-[3px] transition-colors duration-150 hover:bg-[rgba(196,112,74,0.04)]"
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => editTask(task.id, { done: !task.done, status: !task.done ? 'done' : 'todo' })}
        className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-150"
        style={{
          borderColor: task.done ? '#056b63' : 'rgba(160,120,80,0.35)',
          background: task.done ? '#056b63' : 'transparent',
        }}
      >
        {task.done && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1.5 4L3.2 5.7L6.5 2.3"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Task text — clickable to open slide-over */}
      <span
        className="flex-1 truncate cursor-pointer text-[11px] leading-tight"
        style={{
          color: task.done ? '#9a7a5a' : '#5a3e28',
          textDecoration: task.done ? 'line-through' : 'none',
        }}
        onClick={() => onOpen(task)}
      >
        {task.text}
      </span>

      {/* Stale warning */}
      {stale && (
        <AlertCircle
          className="h-[11px] w-[11px] shrink-0"
          style={{ color: '#9a6a28' }}
        />
      )}

      {/* Priority badge */}
      {task.priority !== 'none' && (
        <Badge
          variant={PRIORITY_BADGE_VARIANT[task.priority]}
          className="!px-[5px] !py-0 !text-[9px] !leading-[16px]"
        >
          {priorityCfg.label}
        </Badge>
      )}
    </div>
  );
}

// ─── Inline Add Task ────────────────

function AddTaskInline({ phaseId }: { phaseId: string }) {
  const [value, setValue] = useState('');
  const addTask = useProjectsStore((s) => s.addTask);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    addTask({ phase_id: phaseId, text: trimmed });
    setValue('');
  }, [value, phaseId, addTask]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-center gap-[4px] px-[6px] py-[2px]">
      <Plus className="h-[10px] w-[10px] shrink-0" style={{ color: '#9a7a5a' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={submit}
        placeholder="Añadir tarea..."
        className="flex-1 border-none bg-transparent text-[11px] leading-tight text-[#5a3e28] outline-none placeholder:text-[#b89878]"
      />
    </div>
  );
}

// ─── Phase Section ──────────────────

function PhaseSection({ phase, onOpenTask }: { phase: ProjectPhase; onOpenTask: (t: PhaseTask) => void }) {
  const [expanded, setExpanded] = useState(phase.status === 'in-progress');
  const editPhase = useProjectsStore((s) => s.editPhase);
  const statusCfg = PHASE_STATUS_CONFIG[phase.status];
  const doneCount = phase.tasks.filter((t) => t.done).length;
  const totalCount = phase.tasks.length;
  const Icon = expanded ? ChevronDown : ChevronRight;

  const cycleStatus = useCallback(() => {
    editPhase(phase.id, { status: nextPhaseStatus(phase.status) });
  }, [phase.id, phase.status, editPhase]);

  return (
    <div className="flex flex-col">
      {/* Phase header */}
      <div
        className="flex cursor-pointer items-center gap-[6px] rounded-md px-[4px] py-[4px] transition-colors duration-150 hover:bg-[rgba(196,112,74,0.05)]"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon
          className="h-[12px] w-[12px] shrink-0"
          style={{ color: '#9a7a5a' }}
        />

        {/* Status dot (clickable to cycle) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            cycleStatus();
          }}
          className="h-[8px] w-[8px] shrink-0 rounded-full transition-colors duration-150"
          style={{ background: statusCfg.color }}
          title={statusCfg.label}
        />

        {/* Phase name */}
        <span
          className="flex-1 truncate text-[11px] font-medium leading-tight"
          style={{ color: '#2a1a10' }}
        >
          {phase.name}
        </span>

        {/* Task count */}
        <span
          className="shrink-0 font-mono text-[10px]"
          style={{ color: '#9a7a5a' }}
        >
          {doneCount}/{totalCount}
        </span>
      </div>

      {/* Tasks (expanded) */}
      {expanded && (
        <div className="ml-[14px] flex flex-col gap-[1px] border-l border-[var(--border-medium)] pl-[6px]">
          {phase.tasks
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((task) => (
              <TaskRow key={task.id} task={task} onOpen={onOpenTask} />
            ))}
          <AddTaskInline phaseId={phase.id} />
        </div>
      )}
    </div>
  );
}

// ─── Add Phase Button ───────────────

function AddPhaseButton({ projectId }: { projectId: string }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const addPhase = useProjectsStore((s) => s.addPhase);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    addPhase({ project_id: projectId, name: trimmed });
    setValue('');
    setAdding(false);
  }, [value, projectId, addPhase]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      setValue('');
      setAdding(false);
    }
  };

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex items-center gap-[4px] rounded-md px-[6px] py-[4px] text-[11px] transition-colors duration-150 hover:bg-[rgba(196,112,74,0.05)]"
        style={{ color: '#9a7a5a' }}
      >
        <Plus className="h-[11px] w-[11px]" />
        Añadir fase
      </button>
    );
  }

  return (
    <div className="flex items-center gap-[4px] px-[6px] py-[3px]">
      <Plus className="h-[10px] w-[10px] shrink-0" style={{ color: '#C4704A' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={submit}
        autoFocus
        placeholder="Nombre de la fase..."
        className="flex-1 border-none bg-transparent text-[11px] font-medium leading-tight text-[#2a1a10] outline-none placeholder:text-[#b89878]"
      />
    </div>
  );
}

// ─── Main Component ─────────────────

interface WindowDetailProps {
  userId?: string;
}

export function WindowDetail({ userId }: WindowDetailProps) {
  const selectedProjectId = useCanvasStore((s) => s.selectedProjectId);
  const activeProject = useProjectsStore((s) => s.activeProject);

  const [tab, setTab] = useState<'progress' | 'kanban'>('progress');
  const [slideOverTask, setSlideOverTask] = useState<PhaseTask | null>(null);

  // No project selected
  if (!selectedProjectId || !activeProject || activeProject.id !== selectedProjectId) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-6">
        <span className="text-center text-[11px]" style={{ color: '#9a7a5a' }}>
          Selecciona un proyecto
        </span>
      </div>
    );
  }

  const resolvedUserId = userId ?? activeProject.user_id;
  const progress = computeProgress(activeProject.phases);
  const sortedPhases = activeProject.phases
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Header: name + status */}
      <div className="flex flex-col gap-[4px]">
        <div className="flex items-center gap-[6px]">
          <span
            className="flex-1 truncate text-[12px] font-semibold leading-tight"
            style={{ color: '#2a1a10' }}
          >
            {activeProject.name}
          </span>
          <Badge variant="gray" className="!text-[9px] !px-[5px] !py-0 !leading-[16px]">
            {activeProject.status}
          </Badge>
        </div>

        {/* Progress bar */}
        <Progress value={progress} showLabel className="[&_div:first-child]:!h-[3px]" />
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: 'var(--border-medium)' }} />

      {/* Tab switcher */}
      <div className="flex gap-[4px]">
        {(['progress', 'kanban'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 font-sans text-[10px] font-medium transition-colors"
            style={{
              padding: '4px 0',
              borderRadius: 5,
              border: tab === t ? '0.5px solid rgba(196,112,74,0.4)' : '0.5px solid var(--border-medium)',
              background: tab === t ? 'rgba(196,112,74,0.10)' : 'transparent',
              color: tab === t ? '#C4704A' : 'var(--text-tertiary)',
            }}
          >
            {t === 'progress' ? 'Progreso' : 'Kanban'}
          </button>
        ))}
      </div>

      {/* Phases list (progress tab) */}
      {tab === 'progress' && (
        <div className="flex flex-col gap-[2px]">
          {sortedPhases.map((phase) => (
            <PhaseSection key={phase.id} phase={phase} onOpenTask={setSlideOverTask} />
          ))}
          <AddPhaseButton projectId={activeProject.id} />
        </div>
      )}

      {/* Kanban tab */}
      {tab === 'kanban' && (
        <KanbanView
          phases={sortedPhases}
          projectId={activeProject.id}
          userId={resolvedUserId}
          onOpenTask={setSlideOverTask}
        />
      )}

      {/* Task slide-over */}
      <TaskSlideOver
        task={slideOverTask}
        projectId={activeProject.id}
        userId={resolvedUserId}
        onClose={() => setSlideOverTask(null)}
      />
    </div>
  );
}
