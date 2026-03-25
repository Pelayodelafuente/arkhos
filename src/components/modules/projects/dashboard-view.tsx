'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Layers, Calendar } from 'lucide-react';
import { TASK_PRIORITY_CONFIG, type ProjectPhase } from '@/types/projects';

// ─── Helpers ────────────────────────────

function getAllTasks(phases: ProjectPhase[]) {
  return phases.flatMap((p) => p.tasks);
}

function formatRelativeDate(dateStr: string): { text: string; isPast: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);

  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: 'hoy', isPast: false };
  if (diffDays === 1) return { text: 'mañana', isPast: false };
  if (diffDays === -1) return { text: 'hace 1 día', isPast: true };
  if (diffDays > 1) return { text: `en ${diffDays} días`, isPast: false };
  return { text: `hace ${Math.abs(diffDays)} días`, isPast: true };
}

function computeHealthScore(phases: ProjectPhase[]): number {
  const tasks = getAllTasks(phases);
  const totalTasks = tasks.length;
  if (totalTasks === 0) return 0;

  const doneTasks = tasks.filter((t) => t.done).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasksWithDueDate = tasks.filter((t) => t.due_date);
  const notOverdueTasks = tasksWithDueDate.filter((t) => {
    const due = new Date(t.due_date!);
    due.setHours(0, 0, 0, 0);
    return due >= today || t.done;
  }).length;

  const inProgressPhases = phases.filter((p) => p.status === 'in-progress').length;

  const taskScore = (doneTasks / totalTasks) * 50;
  const overdueScore =
    tasksWithDueDate.length > 0
      ? (notOverdueTasks / tasksWithDueDate.length) * 30
      : 30;
  const phaseScore = inProgressPhases <= 2 ? 20 : 10;

  return Math.round(taskScore + overdueScore + phaseScore);
}

function getHealthColor(score: number): string {
  if (score >= 80) return '#056b63';
  if (score >= 50) return '#9a6a28';
  return '#5f1b29';
}

// ─── Component ──────────────────────────

interface DashboardViewProps {
  phases: ProjectPhase[];
}

export default function DashboardView({ phases }: DashboardViewProps) {
  const [donutAnimated, setDonutAnimated] = useState(false);
  const [barsAnimated, setBarsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDonutAnimated(true);
      setBarsAnimated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const tasks = getAllTasks(phases);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.done).length;
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent').length;

  const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
  const trackedHours = parseFloat(
    (tasks.reduce((sum, t) => sum + (t.tracked_seconds || 0), 0) / 3600).toFixed(1)
  );

  const totalPhases = phases.length;
  const donePhases = phases.filter((p) => p.status === 'done').length;

  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Priority counts (excluding 'none')
  const priorityCounts: { key: 'urgent' | 'high' | 'medium' | 'low'; label: string; color: string; count: number }[] = [
    { key: 'urgent', label: TASK_PRIORITY_CONFIG.urgent.label, color: TASK_PRIORITY_CONFIG.urgent.color, count: tasks.filter((t) => t.priority === 'urgent').length },
    { key: 'high', label: TASK_PRIORITY_CONFIG.high.label, color: TASK_PRIORITY_CONFIG.high.color, count: tasks.filter((t) => t.priority === 'high').length },
    { key: 'medium', label: TASK_PRIORITY_CONFIG.medium.label, color: TASK_PRIORITY_CONFIG.medium.color, count: tasks.filter((t) => t.priority === 'medium').length },
    { key: 'low', label: TASK_PRIORITY_CONFIG.low.label, color: TASK_PRIORITY_CONFIG.low.color, count: tasks.filter((t) => t.priority === 'low').length },
  ];
  const maxPriorityCount = Math.max(...priorityCounts.map((p) => p.count), 1);

  // Upcoming deadlines
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tasksWithDates = tasks
    .filter((t) => t.due_date && !t.done)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  // Phase name lookup
  const phaseNameMap = new Map(phases.map((p) => [p.id, p.name]));

  // Health score
  const healthScore = computeHealthScore(phases);
  const healthColor = getHealthColor(healthScore);

  // Donut SVG math
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = donutAnimated
    ? circumference * (1 - progress / 100)
    : circumference;

  return (
    <div className="space-y-6">
      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total / Completadas */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-[#056b63]" />
            <span className="text-xs text-text-tertiary">Tareas completadas</span>
          </div>
          <p className="font-mono text-2xl text-foreground">
            {doneTasks}/{totalTasks}
          </p>
        </div>

        {/* Urgentes */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle
              size={18}
              className={urgentTasks > 0 ? 'text-[#b94444]' : 'text-text-tertiary'}
            />
            <span className="text-xs text-text-tertiary">Tareas urgentes</span>
          </div>
          <p
            className="font-mono text-2xl"
            style={{ color: urgentTasks > 0 ? '#b94444' : undefined }}
          >
            {urgentTasks}
          </p>
        </div>

        {/* Tiempo */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-text-tertiary" />
            <span className="text-xs text-text-tertiary">Tiempo</span>
          </div>
          <p className="font-mono text-2xl text-foreground">
            {estimatedHours}h{' '}
            <span className="text-sm text-text-tertiary">est</span>
            {' / '}
            {trackedHours}h{' '}
            <span className="text-sm text-text-tertiary">real</span>
          </p>
        </div>

        {/* Fases */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={18} className="text-text-tertiary" />
            <span className="text-xs text-text-tertiary">Fases completadas</span>
          </div>
          <p className="font-mono text-2xl text-foreground">
            {donePhases}/{totalPhases}
          </p>
        </div>
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Donut de progreso */}
        <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="w-48 h-48">
            {/* Background circle */}
            <circle
              cx={100}
              cy={100}
              r={radius}
              fill="none"
              stroke="#E2D9CA"
              strokeWidth={20}
            />
            {/* Progress arc */}
            <circle
              cx={100}
              cy={100}
              r={radius}
              fill="none"
              stroke="#C4704A"
              strokeWidth={20}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.16,1,0.3,1)' }}
            />
            {/* Center text */}
            <text
              x={100}
              y={95}
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-mono"
              style={{ fontSize: '36px', fontWeight: 700, fill: '#2a1a10' }}
            >
              {progress}%
            </text>
            <text
              x={100}
              y={118}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: '12px', fill: '#9a7a5a' }}
            >
              completado
            </text>
          </svg>
        </div>

        {/* Right: Barras de prioridad */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-center gap-4">
          <p className="text-sm text-text-secondary font-medium mb-1">
            Distribución por prioridad
          </p>
          {priorityCounts.map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              <span className="text-xs text-text-secondary w-16 shrink-0 text-right">
                {item.label}
              </span>
              <div className="flex-1 h-6 rounded-md bg-sand/50 overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: barsAnimated
                      ? `${(item.count / maxPriorityCount) * 100}%`
                      : '0%',
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="font-mono text-sm text-text-secondary w-8 shrink-0">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 — Deadlines + Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Próximos deadlines */}
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-text-secondary font-medium mb-4">
            Próximos deadlines
          </p>
          {tasksWithDates.length > 0 ? (
            <ul className="space-y-3">
              {tasksWithDates.map((task) => {
                const rel = formatRelativeDate(task.due_date!);
                const phaseName = phaseNameMap.get(task.phase_id) ?? '';
                return (
                  <li key={task.id} className="flex items-center gap-3">
                    <span className="text-sm text-foreground flex-1 truncate">
                      {task.text}
                    </span>
                    {phaseName && (
                      <span className="text-xs bg-sand rounded-full px-2 py-0.5 text-text-secondary shrink-0">
                        {phaseName}
                      </span>
                    )}
                    <span
                      className="text-xs font-mono shrink-0"
                      style={{ color: rel.isPast ? '#5f1b29' : '#9a7a5a' }}
                    >
                      {rel.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
              <Calendar size={28} className="mb-2" />
              <span className="text-sm">Sin fechas límite asignadas</span>
            </div>
          )}
        </div>

        {/* Health Score */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center justify-center">
          <span className="text-xs text-text-tertiary mb-3">Salud del proyecto</span>
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2"
            style={{ backgroundColor: healthColor + '18', border: `1px solid ${healthColor}40` }}
          >
            <span
              className="font-mono text-3xl font-bold"
              style={{ color: healthColor }}
            >
              {healthScore}
            </span>
          </div>
          <span
            className="text-xs mt-2 font-medium"
            style={{ color: healthColor }}
          >
            {healthScore >= 80 ? 'Excelente' : healthScore >= 50 ? 'Aceptable' : 'Necesita atención'}
          </span>
        </div>
      </div>
    </div>
  );
}
