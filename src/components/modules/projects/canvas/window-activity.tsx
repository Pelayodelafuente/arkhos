'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle, Plus, Layers, Edit3, Trash2, RefreshCw, type LucideIcon } from 'lucide-react';
import { useProjectsStore } from '@/stores/projects-store';
import { createClient } from '@/lib/supabase/client';
import { getProjectActivity, type ActivityEntry } from '@/lib/supabase/activity';

// ─── Action config ───────────────────

interface ActionStyle {
  icon: LucideIcon;
  color: string;
  label: (entityName: string | null) => string;
}

const ACTION_STYLES: Record<string, ActionStyle> = {
  task_completed: { icon: CheckCircle, color: 'var(--success)', label: (n) => (n ? `Tarea completada: ${n}` : 'Tarea completada') },
  task_created: { icon: Plus, color: 'var(--accent-terracotta)', label: (n) => (n ? `Nueva tarea: ${n}` : 'Tarea creada') },
  phase_created: { icon: Layers, color: 'var(--accent-terracotta)', label: (n) => (n ? `Nueva fase: ${n}` : 'Fase creada') },
  phase_completed: { icon: CheckCircle, color: 'var(--success)', label: (n) => (n ? `Fase completada: ${n}` : 'Fase completada') },
  project_edited: { icon: Edit3, color: 'var(--warning)', label: () => 'Proyecto editado' },
  project_deleted: { icon: Trash2, color: 'var(--error)', label: () => 'Proyecto eliminado' },
  status_changed: { icon: RefreshCw, color: 'var(--warning)', label: () => 'Estado cambiado' },
  manual_note: { icon: Edit3, color: 'var(--text-secondary)', label: (n) => n ?? 'Nota manual' },
};

const DEFAULT_STYLE: ActionStyle = { icon: Activity, color: 'var(--text-tertiary)', label: (n) => n ?? 'Actividad registrada' };

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

const MAX_ENTRIES = 5;

export function WindowActivity({ userId }: { userId: string }) {
  const activeProject = useProjectsStore((s) => s.activeProject);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProject) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const client = createClient();
    getProjectActivity(client, userId, activeProject.id, MAX_ENTRIES).then((result) => {
      if (!cancelled) {
        setEntries(result.entries);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, userId]);

  if (!activeProject) {
    return (
      <p className="py-4 text-center font-sans text-[10px] text-text-tertiary">
        Selecciona un proyecto
      </p>
    );
  }

  if (loading) {
    return (
      <p className="py-4 text-center font-sans text-[10px] text-text-tertiary">
        Cargando...
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="py-4 text-center font-sans text-[10px] text-text-tertiary">
        Sin actividad reciente
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[4px]">
      {entries.map((entry) => {
        const style = ACTION_STYLES[entry.action] ?? DEFAULT_STYLE;
        const Icon = style.icon;
        const label = style.label(entry.entity_name);
        return (
          <div
            key={entry.id}
            className="flex items-center gap-[6px] rounded-md px-[8px] py-[5px]"
            style={{ background: 'color-mix(in srgb, var(--bg-sand) 55%, transparent)' }}
          >
            <Icon size={12} strokeWidth={2} style={{ color: style.color, flexShrink: 0 }} />
            <span
              className="min-w-0 flex-1 truncate font-sans text-[10px]"
              style={{ color: 'var(--text-secondary)' }}
              title={label}
            >
              {label}
            </span>
            <span className="shrink-0 font-mono text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
              {relativeTime(entry.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
