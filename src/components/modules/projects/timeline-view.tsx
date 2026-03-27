'use client';

import { useMemo } from 'react';
import { type ProjectPhase, type PhaseTask, TASK_PRIORITY_CONFIG } from '@/types/projects';

// ─── Helpers ─────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

const PHASE_COLOR = '#C4704A';

const STATUS_COLORS: Record<string, string> = {
  todo: '#9a7a5a',
  in_progress: '#c4704a',
  review: '#9a6a28',
  done: '#056b63',
  blocked: '#5f1b29',
};

// ─── Types ───────────────────────────

interface TimelineTask extends PhaseTask {
  phaseName: string;
}

interface TimelinePhaseRow {
  phase: ProjectPhase;
  tasks: TimelineTask[];
  phaseStart: Date | null;
  phaseEnd: Date | null;
}

// ─── Main Component ──────────────────

interface TimelineViewProps {
  phases: ProjectPhase[];
}

export default function TimelineView({ phases }: TimelineViewProps) {
  // Collect all tasks with dates
  const allTasksWithDates = useMemo(() =>
    phases.flatMap((phase) =>
      phase.tasks
        .filter((t) => t.start_date || t.due_date)
        .map((t) => ({ ...t, phaseName: phase.name }))
    ), [phases]);

  // Calculate global date range
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (allTasksWithDates.length === 0) {
      const today = new Date();
      const start = addDays(today, -15);
      const end = addDays(today, 75);
      return { rangeStart: start, rangeEnd: end, totalDays: 90 };
    }

    const dates: Date[] = [];
    for (const t of allTasksWithDates) {
      if (t.start_date) dates.push(new Date(t.start_date));
      if (t.due_date) dates.push(new Date(t.due_date));
    }

    const minDate = addDays(new Date(Math.min(...dates.map((d) => d.getTime()))), -7);
    const maxDate = addDays(new Date(Math.max(...dates.map((d) => d.getTime()))), 7);
    const total = Math.max(daysBetween(minDate, maxDate), 30);

    return { rangeStart: minDate, rangeEnd: maxDate, totalDays: total };
  }, [allTasksWithDates]);

  // Generate month markers for the X axis
  const monthMarkers = useMemo(() => {
    const markers: { date: Date; label: string; left: number }[] = [];
    let cur = startOfMonth(rangeStart);
    if (cur < rangeStart) cur = startOfMonth(addDays(rangeStart, 32));

    while (cur <= rangeEnd) {
      const left = (daysBetween(rangeStart, cur) / totalDays) * 100;
      if (left >= 0 && left <= 100) {
        markers.push({ date: cur, label: formatMonthYear(cur), left });
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return markers;
  }, [rangeStart, rangeEnd, totalDays]);

  // Today position
  const todayLeft = useMemo(() => {
    const pct = (daysBetween(rangeStart, new Date()) / totalDays) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [rangeStart, totalDays]);

  // Build phase rows
  const phaseRows: TimelinePhaseRow[] = useMemo(() =>
    phases.map((phase) => {
      const tasks = phase.tasks.filter((t) => t.start_date || t.due_date).map((t) => ({ ...t, phaseName: phase.name }));
      const dates: Date[] = [];
      for (const t of tasks) {
        if (t.start_date) dates.push(new Date(t.start_date));
        if (t.due_date) dates.push(new Date(t.due_date));
      }
      const phaseStart = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
      const phaseEnd = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
      return { phase, tasks, phaseStart, phaseEnd };
    }), [phases]);

  // Tasks without dates (shown separately)
  const tasksWithoutDates = useMemo(() =>
    phases.flatMap((p) => p.tasks.filter((t) => !t.start_date && !t.due_date)), [phases]);

  function barPosition(start: Date | null, end: Date | null, fallback?: Date): { left: string; width: string } | null {
    const s = start ?? fallback ?? null;
    const e = end ?? start ?? fallback ?? null;
    if (!s || !e) return null;
    const leftPct = (daysBetween(rangeStart, s) / totalDays) * 100;
    const widthPct = Math.max((daysBetween(s, e) / totalDays) * 100, 0.5);
    if (leftPct > 100 || leftPct + widthPct < 0) return null;
    return {
      left: `${Math.max(0, leftPct).toFixed(2)}%`,
      width: `${Math.min(widthPct, 100 - Math.max(0, leftPct)).toFixed(2)}%`,
    };
  }

  const hasAnyDates = allTasksWithDates.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-sand/50 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">Timeline</h3>
        <p className="text-[10px] text-text-tertiary">
          Basado en fechas de inicio y límite de las tareas
        </p>
      </div>

      {!hasAnyDates ? (
        <div className="py-16 text-center">
          <p className="text-sm text-text-tertiary">
            Añade fechas de inicio o límite a las tareas para verlas en el timeline
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: '700px' }}>
            {/* X axis — month markers */}
            <div className="relative flex border-b border-border bg-sand/30" style={{ height: '36px' }}>
              {/* Label column spacer */}
              <div style={{ width: '220px', flexShrink: 0 }} className="border-r border-border" />
              {/* Chart area */}
              <div className="relative flex-1">
                {monthMarkers.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 flex items-center"
                    style={{ left: `${m.left}%` }}
                  >
                    <div className="absolute top-0 bottom-0 w-px bg-border/60" />
                    <span className="ml-1.5 whitespace-nowrap text-[10px] font-medium text-text-tertiary">
                      {m.label}
                    </span>
                  </div>
                ))}
                {/* Today line header indicator */}
                <div
                  className="absolute top-0 bottom-0 z-10"
                  style={{ left: `${todayLeft}%` }}
                >
                  <div className="absolute top-0 bottom-0 w-px bg-accent/60" />
                  <span className="absolute top-1 left-1 text-[9px] font-semibold text-accent">Hoy</span>
                </div>
              </div>
            </div>

            {/* Phase rows */}
            {phaseRows.map((row) => (
              <div key={row.phase.id}>
                {/* Phase bar row */}
                <div className="relative flex items-center border-b border-border/50 bg-sand/20 hover:bg-sand/40" style={{ height: '36px' }}>
                  {/* Label */}
                  <div
                    style={{ width: '220px', flexShrink: 0 }}
                    className="flex items-center gap-2 border-r border-border px-3"
                  >
                    <span className="truncate text-xs font-semibold text-foreground">{row.phase.name}</span>
                    <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white" style={{ backgroundColor: '#C4704A' }}>
                      {row.tasks.length}
                    </span>
                  </div>
                  {/* Chart area */}
                  <div className="relative flex-1 h-full">
                    {/* Today line */}
                    <div className="absolute inset-y-0 w-px bg-accent/40 z-10" style={{ left: `${todayLeft}%` }} />
                    {/* Phase bar */}
                    {(() => {
                      const pos = barPosition(row.phaseStart, row.phaseEnd);
                      if (!pos) return null;
                      return (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 rounded-md opacity-25"
                          style={{ left: pos.left, width: pos.width, height: '12px', backgroundColor: PHASE_COLOR }}
                        />
                      );
                    })()}
                  </div>
                </div>

                {/* Task rows */}
                {row.tasks.map((task) => {
                  const startDate = task.start_date ? new Date(task.start_date) : null;
                  const dueDate = task.due_date ? new Date(task.due_date) : null;
                  const pos = barPosition(startDate, dueDate, startDate ?? dueDate ?? undefined);
                  const taskColor = STATUS_COLORS[task.status] ?? '#9a7a5a';
                  const overdue = task.due_date && new Date(task.due_date) < new Date(new Date().toDateString()) && !task.done;

                  return (
                    <div
                      key={task.id}
                      className="relative flex items-center border-b border-border/30 hover:bg-sand/20"
                      style={{ height: '30px' }}
                    >
                      {/* Label */}
                      <div
                        style={{ width: '220px', flexShrink: 0 }}
                        className="flex items-center gap-1.5 border-r border-border pl-7 pr-3"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: taskColor }}
                        />
                        <span className={`truncate text-[11px] ${task.done ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}>
                          {task.text}
                        </span>
                      </div>
                      {/* Chart */}
                      <div className="relative flex-1 h-full">
                        {/* Today line */}
                        <div className="absolute inset-y-0 w-px bg-accent/30 z-10" style={{ left: `${todayLeft}%` }} />
                        {/* Task bar */}
                        {pos && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 rounded-sm flex items-center px-1.5 overflow-hidden"
                            style={{
                              left: pos.left,
                              width: pos.width,
                              height: '16px',
                              backgroundColor: overdue ? '#5f1b29' : taskColor,
                              opacity: task.done ? 0.45 : 0.85,
                            }}
                            title={`${task.text}${task.start_date ? ` · Inicio: ${task.start_date}` : ''}${task.due_date ? ` · Límite: ${task.due_date}` : ''}`}
                          >
                            <span className="truncate text-[9px] font-medium text-white leading-none">
                              {task.text}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Tasks without dates */}
            {tasksWithoutDates.length > 0 && (
              <div className="border-t border-border/50 bg-sand/10 px-4 py-3">
                <p className="mb-1.5 text-[10px] font-medium text-text-tertiary">Sin fechas ({tasksWithoutDates.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {tasksWithoutDates.map((t) => (
                    <span
                      key={t.id}
                      className={`rounded-full px-2 py-0.5 text-[10px] ${t.done ? 'bg-sand text-text-tertiary line-through' : 'bg-sand text-text-secondary'}`}
                    >
                      {t.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
