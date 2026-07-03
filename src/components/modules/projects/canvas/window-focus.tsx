'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/stores/ui-store';
import { TASK_PRIORITY_CONFIG, type TaskPriority } from '@/types/projects';

interface FocusTask {
  id: string;
  text: string;
  priority: TaskPriority;
  due_date: string | null;
  done: boolean;
  project_name: string;
  project_id: string;
}

interface WindowFocusProps {
  userId: string;
}

function priorityOrder(p: TaskPriority): number {
  const order: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1, none: 0 };
  return order[p];
}

function isOverdue(date: string): boolean {
  return new Date(date) < new Date(new Date().toDateString());
}

type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

export function WindowFocus({ userId }: WindowFocusProps) {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all');
  const [showAllTasks, setShowAllTasks] = useState(false);
  const toast = useToast();

  // Derive unique projects from tasks
  const projectOptions = Array.from(
    new Map(tasks.map((t) => [t.project_id, t.project_name])).entries()
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      const client = createClient();

      // Fetch pending tasks across all user's projects via RLS
      const { data, error } = await client
        .from('phase_tasks')
        .select(`
          id, text, priority, due_date, done,
          project_phases!inner(
            project_id,
            projects!inner(id, name, user_id)
          )
        `)
        .eq('done', false)
        .neq('priority', 'none')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(30);

      if (error || !data) {
        setLoading(false);
        return;
      }

      const mapped: FocusTask[] = (data as unknown[]).map((row) => {
        const r = row as {
          id: string;
          text: string;
          priority: string;
          due_date: string | null;
          done: boolean;
          project_phases: {
            project_id: string;
            projects: { id: string; name: string; user_id: string };
          };
        };
        return {
          id: r.id,
          text: r.text,
          priority: r.priority as TaskPriority,
          due_date: r.due_date,
          done: r.done,
          project_name: r.project_phases.projects.name,
          project_id: r.project_phases.projects.id,
        };
      }).sort((a, b) => priorityOrder(b.priority) - priorityOrder(a.priority));

      setTasks(mapped);
      setLoading(false);
    }
    load();
  }, [userId]);

  async function toggleDone(taskId: string) {
    const client = createClient();
    // Optimistic removal with undo
    const taskToUndo = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await client.from('phase_tasks').update({ done: true }).eq('id', taskId);
    if (taskToUndo) {
      toast.success('Tarea completada', {
        label: 'Deshacer',
        onClick: async () => {
          await createClient().from('phase_tasks').update({ done: false }).eq('id', taskId);
          setTasks((prev) => {
            const exists = prev.some((t) => t.id === taskId);
            if (exists) return prev;
            return [{ ...taskToUndo, done: false }, ...prev];
          });
        },
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <p className="font-sans text-[10px] text-text-tertiary">Cargando...</p>
      </div>
    );
  }

  const MAX_VISIBLE_TASKS = 6;

  const filteredTasks = tasks.filter((t) => {
    if (filterProjectId && t.project_id !== filterProjectId) return false;
    if (filterPriority === 'high') return t.priority === 'high';
    if (filterPriority === 'medium') return t.priority === 'medium';
    if (filterPriority === 'low') return t.priority === 'low';
    return true;
  });

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8">
        <CheckCircle2 size={20} style={{ color: '#22C55E', opacity: 0.7 }} />
        <p className="font-sans text-[11px] font-medium" style={{ color: '#22C55E' }}>¡Todo al día!</p>
        <p className="font-sans text-[10px] text-text-tertiary">No hay tareas pendientes</p>
      </div>
    );
  }

  const visibleTasks = showAllTasks ? filteredTasks : filteredTasks.slice(0, MAX_VISIBLE_TASKS);
  const hasMoreTasks = filteredTasks.length > MAX_VISIBLE_TASKS;

  const PRIORITY_FILTERS: { key: PriorityFilter; label: string }[] = [
    { key: 'all', label: `Todas (${tasks.length})` },
    { key: 'high', label: 'Alta' },
    { key: 'medium', label: 'Media' },
    { key: 'low', label: 'Baja' },
  ];

  function pillStyle(active: boolean) {
    return {
      background: active ? 'rgba(196,112,74,0.12)' : 'transparent',
      color: active ? 'var(--accent-terracotta)' : 'var(--text-tertiary)',
      border: active ? '0.5px solid rgba(196,112,74,0.35)' : '0.5px solid var(--border-stone)',
    };
  }

  return (
    <div className="flex flex-col gap-[6px]">
      {/* Priority filter pills */}
      <div className="flex flex-wrap gap-[4px]">
        {PRIORITY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterPriority(key)}
            className="cursor-pointer rounded-[4px] px-[6px] py-[2px] font-sans text-[9px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
            style={pillStyle(filterPriority === key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Project filter pills */}
      {projectOptions.length > 1 && (
        <div className="flex flex-wrap gap-[4px]">
          <button
            type="button"
            onClick={() => setFilterProjectId(null)}
            className="cursor-pointer rounded-[4px] px-[6px] py-[2px] font-sans text-[9px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
            style={pillStyle(filterProjectId === null)}
          >
            Todos
          </button>
          {projectOptions.map(([id, name]) => (
            <button
              key={id}
              type="button"
              title={name}
              onClick={() => setFilterProjectId(filterProjectId === id ? null : id)}
              className="max-w-[120px] cursor-pointer truncate rounded-[4px] px-[6px] py-[2px] font-sans text-[9px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
              style={pillStyle(filterProjectId === id)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Empty filtered state */}
      {filteredTasks.length === 0 && (
        <p className="py-4 text-center font-sans text-[10px] text-text-tertiary">Sin tareas con este filtro</p>
      )}

    <div className="flex flex-col gap-[3px]">
      {visibleTasks.map((task) => {
        const cfg = TASK_PRIORITY_CONFIG[task.priority];
        const overdue = task.due_date && isOverdue(task.due_date);
        return (
          <div
            key={task.id}
            className="group flex items-start gap-[6px] rounded-md px-[6px] py-[5px] transition-colors hover:bg-[rgba(196,112,74,0.04)]"
          >
            {/* Checkbox */}
            <button
              type="button"
              role="checkbox"
              aria-checked={task.done}
              aria-label="Marcar tarea como completada"
              onClick={() => toggleDone(task.id)}
              className="mt-[1px] flex h-[13px] w-[13px] cursor-pointer shrink-0 items-center justify-center rounded-[3px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
              style={{
                borderColor: 'rgba(160,120,80,0.35)',
                background: 'transparent',
              }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className="truncate font-sans leading-tight"
                style={{ fontSize: 10, color: '#5a3e28' }}
              >
                {task.text}
              </p>
              <div className="flex items-center gap-[4px] mt-[2px]">
                <span
                  style={{ fontSize: 8, color: cfg.color, fontWeight: 600, letterSpacing: 0.2 }}
                >
                  {cfg.label}
                </span>
                <span style={{ fontSize: 8, color: '#aaa' }}>·</span>
                <span
                  className="truncate"
                  style={{ fontSize: 8, color: '#9a7a5a', maxWidth: 80 }}
                >
                  {task.project_name}
                </span>
                {task.due_date && (
                  <>
                    <span style={{ fontSize: 8, color: '#aaa' }}>·</span>
                    <span
                      style={{
                        fontSize: 8,
                        color: overdue ? '#dc2626' : '#9a7a5a',
                        fontFamily: 'monospace',
                      }}
                    >
                      {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    {hasMoreTasks && !showAllTasks && (
      <button
        type="button"
        onClick={() => setShowAllTasks(true)}
        className="cursor-pointer font-sans text-[10px] font-medium text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
      >
        Ver {filteredTasks.length - MAX_VISIBLE_TASKS} más
      </button>
    )}
    {hasMoreTasks && showAllTasks && (
      <button
        type="button"
        onClick={() => setShowAllTasks(false)}
        className="cursor-pointer font-sans text-[10px] font-medium text-text-tertiary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
      >
        Mostrar menos
      </button>
    )}
    </div>
  );
}
