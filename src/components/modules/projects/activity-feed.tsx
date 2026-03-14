"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getRecentActivity, type ActivityEntry } from "@/lib/supabase/activity";

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

interface ActivityFeedProps {
  userId: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const client = createClient();
    getRecentActivity(client, userId, 10, "proyectos").then((data) => {
      setEntries(data);
      setLoaded(true);
    });
  }, [userId]);

  if (!loaded || entries.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <Activity size={14} strokeWidth={2} className="text-text-tertiary" />
        <h3 className="text-sm font-medium text-foreground">Actividad reciente</h3>
      </div>
      <div className="space-y-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
          >
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
            <span className="flex-1 text-text-secondary">
              <span className="font-medium text-foreground">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              {entry.entity_name && (
                <span className="text-text-tertiary">
                  {" "}— {entry.entity_name}
                </span>
              )}
            </span>
            <span className="font-mono text-[10px] text-text-tertiary">
              {formatTimeAgo(entry.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
