'use client';

import { useState, useRef } from 'react';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { Check, X, Eye, EyeOff } from 'lucide-react';
import { TagSelector } from './tag-selector';
import {
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type PhaseTask,
  type TaskPriority,
  type TaskStatus,
  type Subtask,
  type UpdateTaskInput,
} from '@/types/projects';
import { useProjectsStore } from '@/stores/projects-store';

// ─── Markdown renderer ─────────────────

marked.setOptions({ breaks: true });

// ─── Priority colors ──────────────────

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  none: '#9a7a5a',
  low: '#16a34a',
  medium: '#ca8a04',
  high: '#ea580c',
};

// ─── Date helpers ─────────────────────

function isOverdue(date: string): boolean {
  return new Date(date) < new Date(new Date().toDateString());
}

// Un valor válido de <input type="date"> es YYYY-MM-DD con año de 4 dígitos
// en un rango sensato. Los inputs date emiten estados intermedios como
// "0202-07-20" mientras se teclea el año → nunca deben persistirse.
function isValidDateValue(val: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
  if (!m) return false;
  const year = Number(m[1]);
  if (year < 1900 || year > 2200) return false;
  return !Number.isNaN(new Date(val).getTime());
}

// ─── Props ────────────────────────────

interface TaskDetailFieldsProps {
  task: PhaseTask;
  onDelete?: () => void;
  onClose?: () => void;
  compact?: boolean;
}

// ─── Component ────────────────────────

export function TaskDetailFields({ task, onDelete, onClose, compact = false }: TaskDetailFieldsProps) {
  const editTask = useProjectsStore((s) => s.editTask);
  const changeTaskStatus = useProjectsStore((s) => s.changeTaskStatus);
  const updateSubtasks = useProjectsStore((s) => s.updateSubtasks);
  const removeTask = useProjectsStore((s) => s.removeTask);
  const projectTags = useProjectsStore((s) => s.projectTags);

  // Live task from store
  const liveTask = useProjectsStore((state) => {
    const project = state.activeProject;
    if (!project) return task;
    for (const phase of project.phases) {
      const found = phase.tasks.find((t) => t.id === task.id);
      if (found) return found;
    }
    return task;
  });

  const [description, setDescription] = useState(liveTask.description || liveTask.content || '');
  const [previewMode, setPreviewMode] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const descTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fechas: estado local para que el input responda al teclear, pero solo se
  // persiste un valor completo y válido (evita corromper el año con estados
  // intermedios como "0202-07-20").
  const [startDate, setStartDate] = useState(liveTask.start_date ?? '');
  const [dueDate, setDueDate] = useState(liveTask.due_date ?? '');
  const [prevDateSync, setPrevDateSync] = useState({
    id: liveTask.id,
    start: liveTask.start_date,
    due: liveTask.due_date,
  });
  if (
    prevDateSync.id !== liveTask.id ||
    prevDateSync.start !== liveTask.start_date ||
    prevDateSync.due !== liveTask.due_date
  ) {
    setPrevDateSync({ id: liveTask.id, start: liveTask.start_date, due: liveTask.due_date });
    setStartDate(liveTask.start_date ?? '');
    setDueDate(liveTask.due_date ?? '');
  }

  function commitDate(field: 'start_date' | 'due_date', val: string) {
    if (val === '') {
      editTask(liveTask.id, { [field]: null } as UpdateTaskInput);
      return;
    }
    if (!isValidDateValue(val)) return; // estado intermedio: no persistir
    editTask(liveTask.id, { [field]: val } as UpdateTaskInput);
  }

  const subtasksDone = liveTask.subtasks.filter((s) => s.completed).length;
  const subtasksTotal = liveTask.subtasks.length;
  const subtasksProgress = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  function handleDescriptionChange(val: string) {
    setDescription(val);
    clearTimeout(descTimerRef.current);
    descTimerRef.current = setTimeout(() => {
      editTask(liveTask.id, { description: val, content: val } as UpdateTaskInput);
    }, 600);
  }

  function toggleSubtask(id: string) {
    const updated: Subtask[] = liveTask.subtasks.map((s) =>
      s.id === id ? { ...s, completed: !s.completed } : s
    );
    updateSubtasks(liveTask.id, updated);
  }

  function removeSubtask(id: string) {
    const updated = liveTask.subtasks.filter((s) => s.id !== id);
    updateSubtasks(liveTask.id, updated);
  }

  function addSubtask() {
    const trimmed = newSubtaskText.trim();
    if (!trimmed) return;
    const newSub: Subtask = { id: crypto.randomUUID(), title: trimmed, completed: false };
    updateSubtasks(liveTask.id, [...liveTask.subtasks, newSub]);
    setNewSubtaskText('');
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    removeTask(liveTask.id);
    onDelete?.();
    onClose?.();
  }

  const parsedHtml = previewMode
    ? sanitizeHtml(marked.parse(description || '') as string)
    : '';

  const space = compact ? 'space-y-3' : 'space-y-5';

  return (
    <div className={space}>

      {/* Status pills */}
      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Estado</p>
        <div className="flex flex-wrap gap-1">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => changeTaskStatus(liveTask.id, s as TaskStatus)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                liveTask.status === s ? 'text-white' : 'bg-sand text-text-secondary hover:bg-border'
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
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Prioridad</p>
        <div className="flex flex-wrap gap-1">
          {TASK_PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => editTask(liveTask.id, { priority: p })}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                liveTask.priority === p ? 'text-white' : 'bg-sand text-text-secondary hover:bg-border'
              }`}
              style={liveTask.priority === p ? { backgroundColor: PRIORITY_COLORS[p] } : undefined}
            >
              {TASK_PRIORITY_CONFIG[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Inicio</span>
          <input
            type="date"
            min="1900-01-01"
            max="2200-12-31"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); commitDate('start_date', e.target.value); }}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={`text-[10px] font-medium uppercase tracking-wide ${
            dueDate && isValidDateValue(dueDate) && isOverdue(dueDate) && !liveTask.done ? 'text-red-500' : 'text-text-tertiary'
          }`}>Límite</span>
          <input
            type="date"
            min="1900-01-01"
            max="2200-12-31"
            value={dueDate}
            onChange={(e) => { setDueDate(e.target.value); commitDate('due_date', e.target.value); }}
            className={`rounded-md border bg-background px-2 py-1.5 text-xs focus:border-accent focus:outline-none ${
              dueDate && isValidDateValue(dueDate) && isOverdue(dueDate) && !liveTask.done
                ? 'border-red-300 text-red-500'
                : 'border-border text-foreground'
            }`}
          />
        </label>
      </div>

      {/* Description with markdown preview */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Descripción</p>
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-text-tertiary transition-colors hover:bg-sand hover:text-foreground"
          >
            {previewMode ? <EyeOff size={10} strokeWidth={2} /> : <Eye size={10} strokeWidth={2} />}
            {previewMode ? 'Editar' : 'Preview'}
          </button>
        </div>
        {previewMode ? (
          <div
            className="prose-arkhos min-h-[80px] rounded-md border border-border bg-background px-3 py-2"
            dangerouslySetInnerHTML={{ __html: parsedHtml }}
          />
        ) : (
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Notas, descripción, ideas... (soporta Markdown)"
            rows={compact ? 3 : 5}
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        )}
      </div>

      {/* Subtasks */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
            Subtareas {subtasksTotal > 0 && `(${subtasksDone}/${subtasksTotal})`}
          </p>
        </div>
        {subtasksTotal > 0 && (
          <div className="mb-2 h-1 rounded-full bg-border">
            <div
              className="h-1 rounded-full bg-accent transition-all duration-500"
              style={{ width: `${subtasksProgress}%` }}
            />
          </div>
        )}
        <div className="space-y-1.5">
          {liveTask.subtasks.map((sub) => (
            <div key={sub.id} className="group flex items-center gap-2">
              <button
                onClick={() => toggleSubtask(sub.id)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  sub.completed ? 'border-accent bg-accent' : 'border-border hover:border-accent'
                }`}
              >
                {sub.completed && <Check size={9} strokeWidth={3} className="text-white" />}
              </button>
              <span className={`flex-1 text-sm ${sub.completed ? 'text-text-tertiary line-through' : 'text-foreground'}`}>
                {sub.title}
              </span>
              <button
                onClick={() => removeSubtask(sub.id)}
                className="text-text-tertiary opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
            placeholder="+ Nueva subtarea"
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Tags */}
      {projectTags.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Tags</p>
          <TagSelector taskId={liveTask.id} selectedTags={liveTask.tags ?? []} />
        </div>
      )}

      {/* Delete */}
      <div className="pt-1 border-t border-border">
        <button
          onClick={handleDelete}
          className={`w-full rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            confirmDelete
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-sand text-text-secondary hover:bg-border'
          }`}
        >
          {confirmDelete ? 'Confirmar eliminación' : 'Eliminar tarea'}
        </button>
        {confirmDelete && (
          <button
            onClick={() => setConfirmDelete(false)}
            className="mt-1 w-full text-center text-xs text-text-tertiary hover:text-foreground"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
