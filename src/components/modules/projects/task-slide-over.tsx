'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Check, Calendar, AlertCircle,
  Plus, Trash2, ChevronRight, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectsStore } from '@/stores/projects-store';
import { useToast } from '@/stores/ui-store';
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

interface TaskSlideOverProps {
  task: PhaseTask | null;
  projectId: string;
  userId: string;
  onClose: () => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  none: '#9a7a5a',
  low: '#16a34a',
  medium: '#ca8a04',
  high: '#ea580c',
  urgent: '#dc2626',
};

function isOverdue(date: string): boolean {
  return new Date(date) < new Date(new Date().toDateString());
}

export function TaskSlideOver({ task, projectId, userId, onClose }: TaskSlideOverProps) {
  const editTask = useProjectsStore((s) => s.editTask);
  const removeTask = useProjectsStore((s) => s.removeTask);
  const changeTaskStatus = useProjectsStore((s) => s.changeTaskStatus);
  const updateSubtasks = useProjectsStore((s) => s.updateSubtasks);
  const projectTags = useProjectsStore((s) => s.projectTags);
  const toast = useToast();

  // Live task from store to prevent stale data
  const liveTask = useProjectsStore((state) => {
    if (!task) return null;
    const project = state.activeProject;
    if (!project) return task;
    for (const phase of project.phases) {
      const found = phase.tasks.find((t) => t.id === task.id);
      if (found) return found;
    }
    return task;
  });

  const [description, setDescription] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const descTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync local state when task changes
  useEffect(() => {
    if (liveTask) {
      setDescription(liveTask.description || liveTask.content || '');
      setConfirmDelete(false);
    }
  }, [liveTask?.id]);

  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    clearTimeout(descTimerRef.current);
    descTimerRef.current = setTimeout(() => {
      if (liveTask) editTask(liveTask.id, { description: value, content: value });
    }, 500);
  }, [liveTask, editTask]);

  function addSubtask() {
    if (!liveTask || !newSubtaskText.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtaskText.trim(),
      completed: false,
    };
    updateSubtasks(liveTask.id, [...liveTask.subtasks, newSub]);
    setNewSubtaskText('');
  }

  function toggleSubtask(subId: string) {
    if (!liveTask) return;
    updateSubtasks(liveTask.id, liveTask.subtasks.map((s) => s.id === subId ? { ...s, completed: !s.completed } : s));
  }

  function removeSubtask(subId: string) {
    if (!liveTask) return;
    updateSubtasks(liveTask.id, liveTask.subtasks.filter((s) => s.id !== subId));
  }

  function addLabel() {
    if (!liveTask || !newLabel.trim()) return;
    const val = newLabel.trim();
    if (liveTask.labels.includes(val)) return;
    editTask(liveTask.id, { labels: [...liveTask.labels, val] } as UpdateTaskInput);
    setNewLabel('');
  }

  function removeLabel(label: string) {
    if (!liveTask) return;
    editTask(liveTask.id, { labels: liveTask.labels.filter((l) => l !== label) } as UpdateTaskInput);
  }

  async function handleDelete() {
    if (!liveTask) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await removeTask(liveTask.id);
    onClose();
  }

  const subtasksDone = liveTask?.subtasks.filter((s) => s.completed).length ?? 0;
  const subtasksTotal = liveTask?.subtasks.length ?? 0;
  const subtasksProgress = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  return (
    <AnimatePresence>
      {task && liveTask && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card shadow-[−4px_0_24px_rgba(26,23,20,0.08)] sm:w-[480px]"
          >
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-border p-5">
              <div className="flex-1 min-w-0">
                {/* Status pill row */}
                <div className="mb-2 flex flex-wrap gap-1">
                  {TASK_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeTaskStatus(liveTask.id, s)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                        liveTask.status === s ? 'text-white' : 'bg-sand text-text-tertiary hover:bg-border'
                      }`}
                      style={liveTask.status === s ? { backgroundColor: TASK_STATUS_CONFIG[s].color } : undefined}
                    >
                      {TASK_STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
                {/* Title */}
                <h2 className="font-heading text-lg leading-tight text-foreground">{liveTask.text}</h2>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleDelete}
                  className={`rounded-md p-1.5 transition-colors ${
                    confirmDelete ? 'bg-red-100 text-red-600' : 'text-text-tertiary hover:text-red-500'
                  }`}
                  title={confirmDelete ? 'Click para confirmar' : 'Eliminar tarea'}
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-md p-1.5 text-text-tertiary transition-colors hover:text-foreground"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Priority */}
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
                    value={liveTask.start_date || ''}
                    onChange={(e) => editTask(liveTask.id, { start_date: e.target.value || null })}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={`text-[10px] font-medium uppercase tracking-wide ${
                    liveTask.due_date && isOverdue(liveTask.due_date) && !liveTask.done ? 'text-red-500' : 'text-text-tertiary'
                  }`}>Límite</span>
                  <input
                    type="date"
                    value={liveTask.due_date || ''}
                    onChange={(e) => editTask(liveTask.id, { due_date: e.target.value || null })}
                    className={`rounded-md border bg-background px-2 py-1.5 text-xs focus:border-accent focus:outline-none ${
                      liveTask.due_date && isOverdue(liveTask.due_date) && !liveTask.done
                        ? 'border-red-300 text-red-500'
                        : 'border-border text-foreground'
                    }`}
                  />
                </label>
              </div>

              {/* Descripcion */}
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Descripcion</p>
                <textarea
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Notas, descripcion, ideas..."
                  rows={5}
                  className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                />
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
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addSubtask();
                        if (e.key === 'Escape') setNewSubtaskText('');
                      }}
                      placeholder="Nueva subtarea..."
                      className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />
                    <button onClick={addSubtask} className="text-text-tertiary transition-colors hover:text-accent">
                      <Plus size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Etiquetas de texto</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {liveTask.labels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[10px] text-text-secondary"
                    >
                      {label}
                      <button onClick={() => removeLabel(label)} className="text-text-tertiary hover:text-red-500">
                        <X size={8} strokeWidth={2} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addLabel(); }
                    }}
                    placeholder="+ Etiqueta"
                    className="w-20 rounded border-none bg-transparent px-1 py-0.5 text-[10px] text-foreground placeholder:text-text-tertiary focus:outline-none"
                  />
                </div>
              </div>

              {/* Tags (project-level colored tags) */}
              {projectTags.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Tags</p>
                  <TagSelector taskId={liveTask.id} selectedTags={liveTask.tags ?? []} />
                </div>
              )}

              {/* Task links */}
              {liveTask.links.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Enlaces</p>
                  <div className="space-y-1">
                    {liveTask.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-accent transition-colors hover:underline"
                      >
                        <ExternalLink size={12} strokeWidth={2} />
                        {link.label || link.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
