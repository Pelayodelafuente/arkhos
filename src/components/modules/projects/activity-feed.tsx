"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Edit3,
  ListChecks,
  Plus,
  Trash2,
  TrendingUp,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getRecentActivity, type ActivityEntry } from "@/lib/supabase/activity";
import {
  getUpcomingDeadlines,
  getWeeklySummary,
  type UpcomingDeadline,
  type WeeklySummary,
} from "@/lib/supabase/projects";

// ─── Action config ────────────────────

const ACTION_LABELS: Record<string, string> = {
  project_created: "Proyecto creado",
  project_edited: "Proyecto editado",
  project_deleted: "Proyecto eliminado",
  phase_added: "Fase creada",
  phase_status_changed: "Fase actualizada",
  task_added: "Tarea creada",
  task_done: "Tarea completada",
  task_deleted: "Tarea eliminada",
};

interface ActionStyle {
  icon: React.ElementType;
  color: string;
}

const ACTION_STYLES: Record<string, ActionStyle> = {
  task_done: { icon: CheckCircle2, color: "text-green-600" },
  project_created: { icon: Plus, color: "text-accent" },
  project_edited: { icon: Edit3, color: "text-amber-600" },
  project_deleted: { icon: Trash2, color: "text-red-500" },
  phase_added: { icon: Layers, color: "text-accent" },
  phase_status_changed: { icon: Edit3, color: "text-amber-600" },
  task_added: { icon: Plus, color: "text-accent" },
  task_deleted: { icon: Trash2, color: "text-red-500" },
};

const DEFAULT_STYLE: ActionStyle = { icon: Activity, color: "text-text-tertiary" };

// ─── Helpers ──────────────────────────

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function formatDueDate(dateStr: string): { text: string; isOverdue: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: "VENCIDA", isOverdue: true };
  if (diffDays === 0) return { text: "Hoy", isOverdue: false };
  if (diffDays === 1) return { text: "Mañana", isOverdue: false };
  return { text: `en ${diffDays} días`, isOverdue: false };
}

function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return "0m";
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// ─── Component ────────────────────────

interface ActivityFeedProps {
  userId: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const client = createClient();

    Promise.all([
      getRecentActivity(client, userId, 5, "proyectos"),
      getUpcomingDeadlines(client, userId, 5),
      getWeeklySummary(client, userId),
    ]).then(([activityData, deadlineData, summaryData]) => {
      setEntries(activityData);
      setDeadlines(deadlineData);
      setSummary(summaryData);
      setLoaded(true);
    });
  }, [userId]);

  if (!loaded) return null;

  const hasContent =
    entries.length > 0 ||
    deadlines.length > 0 ||
    (summary !== null && (summary.tasksCompleted > 0 || summary.secondsTracked > 0));

  if (!hasContent) return null;

  return (
    <div className="mt-8 space-y-0">
      {/* Resumen de la semana */}
      {summary !== null && (summary.tasksCompleted > 0 || summary.secondsTracked > 0) && (
        <section className="border-b border-border py-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={14} strokeWidth={2} className="text-text-tertiary" />
            <h3 className="text-sm font-medium text-foreground">Resumen de la semana</h3>
          </div>
          <div className="flex gap-6">
            {summary.tasksCompleted > 0 && (
              <div className="flex flex-col">
                <span className="font-mono text-2xl font-semibold text-foreground">
                  {summary.tasksCompleted}
                </span>
                <span className="text-xs text-text-tertiary">
                  {summary.tasksCompleted === 1 ? "tarea completada" : "tareas completadas"}
                </span>
              </div>
            )}
            {summary.secondsTracked > 0 && (
              <div className="flex flex-col">
                <span className="font-mono text-2xl font-semibold text-foreground">
                  {formatSeconds(summary.secondsTracked)}
                </span>
                <span className="text-xs text-text-tertiary">dedicadas</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Próximos vencimientos */}
      <section className="border-b border-border py-4">
        <div className="mb-3 flex items-center gap-2">
          <Calendar size={14} strokeWidth={2} className="text-text-tertiary" />
          <h3 className="text-sm font-medium text-foreground">Próximos vencimientos</h3>
        </div>
        {deadlines.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-tertiary">
            <Calendar size={14} strokeWidth={1.5} />
            <span>Sin fechas límite próximas</span>
          </div>
        ) : (
          <div className="space-y-1">
            {deadlines.map((deadline) => {
              const { text: dueText, isOverdue } = formatDueDate(deadline.due_date);
              return (
                <div
                  key={`${deadline.project_id}-${deadline.task_text}-${deadline.due_date}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                >
                  <ListChecks
                    size={14}
                    strokeWidth={2}
                    className={isOverdue ? "text-red-500" : "text-text-tertiary"}
                  />
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    <span className="truncate text-text-secondary">{deadline.task_text}</span>
                    <span className="text-[11px] text-text-tertiary">{deadline.project_name}</span>
                  </div>
                  <span
                    className={`flex-shrink-0 font-mono text-[10px] font-medium ${
                      isOverdue ? "text-red-500" : "text-text-tertiary"
                    }`}
                  >
                    {dueText}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Actividad reciente */}
      {entries.length > 0 && (
        <section className="py-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity size={14} strokeWidth={2} className="text-text-tertiary" />
            <h3 className="text-sm font-medium text-foreground">Actividad reciente</h3>
          </div>
          <div className="space-y-1">
            {entries.map((entry) => {
              const style = ACTION_STYLES[entry.action] ?? DEFAULT_STYLE;
              const Icon = style.icon;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                >
                  <Icon size={14} strokeWidth={2} className={`flex-shrink-0 ${style.color}`} />
                  <span className="flex-1 text-text-secondary">
                    <span className="font-medium text-foreground">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                    {entry.entity_name && (
                      <span className="text-text-tertiary"> — {entry.entity_name}</span>
                    )}
                  </span>
                  <span className="flex-shrink-0 font-mono text-[10px] text-text-tertiary">
                    {formatTimeAgo(entry.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
