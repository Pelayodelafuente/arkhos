"use client";

// Proyectos activos con progreso de tareas — datos de la megacarga

import { useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { WidgetShell } from "./widget-shell";
import type { SalaWidgetProps } from "./types";

interface ProjectRow {
  id: string;
  name: string;
  done: number;
  total: number;
}

export function WidgetProyectos({ height }: SalaWidgetProps) {
  const data = useDashboardStore((s) => s.data);

  const rows = useMemo<ProjectRow[]>(() => {
    return (data?.initialProjects ?? [])
      .filter((p) => p.status === "active" || p.status === "in_progress")
      .map((p) => {
        const tasks = (p.project_phases ?? []).flatMap((ph) => ph.phase_tasks ?? []);
        return {
          id: p.id,
          name: p.name,
          done: tasks.filter((t) => t.done).length,
          total: tasks.length,
        };
      });
  }, [data]);

  const maxRows = Math.max(2, Math.floor((height - 8) / 34));

  return (
    <WidgetShell title="Proyectos · Activos" accent={MODULE_HEX.proyectos}>
      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.slice(0, maxRows).map((p) => {
            const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <li key={p.id}>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="truncate text-[var(--sala-text-dim)]">{p.name}</span>
                  <span className="ml-auto shrink-0 text-[var(--sala-text)]">
                    {p.done}/{p.total}
                  </span>
                </div>
                <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-[var(--sala-surface)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: MODULE_HEX.proyectos }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="pt-2 font-mono text-[10px] text-[var(--sala-text-dim)]">SIN PROYECTOS ACTIVOS</p>
      )}
    </WidgetShell>
  );
}
