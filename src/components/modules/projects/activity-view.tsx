"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  CheckCircle,
  Plus,
  Layers,
  Edit3,
  Trash2,
  RefreshCw,
  Clock,
  Calendar,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getProjectActivity, logActivity, deleteActivity, type ActivityEntry } from "@/lib/supabase/activity";

// ─── Props ────────────────────────────

interface ActivityViewProps {
  projectId: string;
  userId: string;
}

// ─── Action config ────────────────────

interface ActionConfig {
  icon: LucideIcon;
  color: string;
  dotColor: string;
  label: (entityName: string | null) => string;
}

const ACTION_MAP: Record<string, ActionConfig> = {
  task_completed: {
    icon: CheckCircle,
    color: "text-green-600",
    dotColor: "bg-green-500",
    label: (name) => (name ? `Tarea \u00AB${name}\u00BB completada` : "Tarea completada"),
  },
  task_created: {
    icon: Plus,
    color: "text-accent",
    dotColor: "bg-accent",
    label: (name) => (name ? `Tarea \u00AB${name}\u00BB creada` : "Tarea creada"),
  },
  phase_created: {
    icon: Layers,
    color: "text-accent",
    dotColor: "bg-accent",
    label: (name) => (name ? `Fase \u00AB${name}\u00BB creada` : "Fase creada"),
  },
  phase_completed: {
    icon: CheckCircle,
    color: "text-green-600",
    dotColor: "bg-green-500",
    label: (name) => (name ? `Fase \u00AB${name}\u00BB completada` : "Fase completada"),
  },
  project_created: {
    icon: Plus,
    color: "text-accent",
    dotColor: "bg-accent",
    label: () => "Proyecto creado",
  },
  project_edited: {
    icon: Edit3,
    color: "text-amber-600",
    dotColor: "bg-amber-500",
    label: () => "Proyecto actualizado",
  },
  project_deleted: {
    icon: Trash2,
    color: "text-text-tertiary",
    dotColor: "bg-text-tertiary",
    label: () => "Proyecto eliminado",
  },
  status_changed: {
    icon: RefreshCw,
    color: "text-amber-600",
    dotColor: "bg-amber-500",
    label: (name) => (name ? `Estado de «${name}» cambiado` : "Estado cambiado"),
  },
  priority_changed: {
    icon: RefreshCw,
    color: "text-amber-600",
    dotColor: "bg-amber-500",
    label: (name) => (name ? `Prioridad de «${name}» cambiada` : "Prioridad cambiada"),
  },
  date_changed: {
    icon: Calendar,
    color: "text-blue-600",
    dotColor: "bg-blue-500",
    label: (name) => (name ? `Fecha de «${name}» actualizada` : "Fecha actualizada"),
  },
  time_tracked: {
    icon: Clock,
    color: "text-blue-600",
    dotColor: "bg-blue-500",
    label: () => "Tiempo registrado",
  },
  manual_note: {
    icon: Edit3,
    color: "text-text-secondary",
    dotColor: "bg-text-tertiary",
    label: (name) => name ?? "Nota manual",
  },
};

const DEFAULT_ACTION: ActionConfig = {
  icon: Activity,
  color: "text-text-tertiary",
  dotColor: "bg-text-tertiary",
  label: (name) => name ?? "Actividad registrada",
};

// ─── Date grouping helpers ─────────────

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";

  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(entries: ActivityEntry[]): { key: string; label: string; entries: ActivityEntry[] }[] {
  const groups: Map<string, { label: string; entries: ActivityEntry[] }> = new Map();

  for (const entry of entries) {
    const key = getDayKey(entry.created_at);
    if (!groups.has(key)) {
      groups.set(key, { label: getDayLabel(entry.created_at), entries: [] });
    }
    groups.get(key)!.entries.push(entry);
  }

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    entries: value.entries,
  }));
}

// ─── Component ────────────────────────

const PAGE_SIZE = 30;

export default function ActivityView({ projectId, userId }: ActivityViewProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchEntries = useCallback(
    async (offset = 0, append = false) => {
      try {
        const client = createClient();
        const result = await getProjectActivity(client, userId, projectId, PAGE_SIZE, offset);

        if (append) {
          setEntries((prev) => [...prev, ...result.entries]);
        } else {
          setEntries(result.entries);
        }
        setHasMore(result.hasMore);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [projectId, userId]
  );

  // Re-fetch when project/user changes — show loading while it happens
  // (loading ya arranca en true en el primer render)
  const [prevFetchKey, setPrevFetchKey] = useState({ projectId, userId });
  if (projectId !== prevFetchKey.projectId || userId !== prevFetchKey.userId) {
    setPrevFetchKey({ projectId, userId });
    setLoading(true);
  }

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchEntries(entries.length, true);
  };

  async function handleAddNote() {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setSavingNote(true);
    try {
      const client = createClient();
      await logActivity(client, userId, 'proyectos', 'manual_note', trimmed, `project:${projectId}`);
      setNoteText('');
      setLoading(true);
      await fetchEntries();
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(id: string) {
    const client = createClient();
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await deleteActivity(client, id);
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  // ── Empty state ──
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-tertiary">
        <Activity className="h-10 w-10" />
        <p className="text-sm">Sin actividad registrada</p>
      </div>
    );
  }

  // ── Timeline ──
  const groups = groupByDay(entries);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Actividad del proyecto</h3>

      {/* Manual note input */}
      <div className="mb-5 flex gap-2">
        <input
          type="text"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
          placeholder="Añadir nota manual..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />
        <Button
          variant="secondary"
          size="sm"
          loading={savingNote}
          onClick={handleAddNote}
          disabled={!noteText.trim()}
        >
          Añadir
        </Button>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            {/* Day header */}
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {group.label}
            </p>

            {/* Timeline entries */}
            <div className="relative ml-3 border-l border-border pl-6">
              {group.entries.map((entry, idx) => {
                const config = ACTION_MAP[entry.action] ?? DEFAULT_ACTION;
                const Icon = config.icon;
                const isLast = idx === group.entries.length - 1;

                return (
                  <div
                    key={entry.id}
                    className={`group relative flex items-start gap-3 ${isLast ? "" : "mb-4 pb-4"}`}
                  >
                    {/* Dot on the timeline line */}
                    <div
                      className={`absolute -left-[30.5px] top-0.5 h-3 w-3 rounded-full border-2 border-card ${config.dotColor}`}
                    />

                    {/* Icon */}
                    <div className={`flex-shrink-0 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        {config.label(entry.entity_name)}
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {formatTime(entry.created_at)}
                      </p>
                    </div>

                    {/* Delete button — only for manual notes */}
                    {entry.action === 'manual_note' && (
                      <button
                        onClick={() => handleDeleteNote(entry.id)}
                        className="flex-shrink-0 rounded p-0.5 text-text-tertiary opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        aria-label="Eliminar nota"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadMore}
            loading={loadingMore}
          >
            Cargar mas
          </Button>
        </div>
      )}
    </div>
  );
}
