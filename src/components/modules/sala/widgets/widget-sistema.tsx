"use client";

// Estado del sistema — actividad reciente + frescura de los datos.
// (El "agente de reconciliación" no tiene backend propio todavía: esto
// muestra activity_log real y la antigüedad del último snapshot.)

import { useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SALA_COLORS } from "@/lib/sala/palette";
import { timeAgo } from "@/lib/sala/format";
import { WidgetShell } from "./widget-shell";
import type { SalaWidgetProps } from "./types";

// Timestamp de carga del módulo: la edad del snapshot no necesita precisión
// viva y Date.now() en render es impuro para el React Compiler.
const MOUNT_TS = Date.now();

export function WidgetSistema({ height }: SalaWidgetProps) {
  const data = useDashboardStore((s) => s.data);

  const lastSnapshot = useMemo(() => {
    const snaps = data?.initialSnapshots ?? [];
    if (snaps.length === 0) return null;
    return [...snaps].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0];
  }, [data]);

  const snapshotAgeDays = lastSnapshot
    ? Math.floor((MOUNT_TS - new Date(lastSnapshot.snapshot_date).getTime()) / 86_400_000)
    : null;
  const fresh = snapshotAgeDays !== null && snapshotAgeDays <= 7;

  const maxRows = Math.max(2, Math.floor((height - 30) / 26));
  const activity = (data?.initialActivity ?? []).slice(0, maxRows);

  return (
    <WidgetShell
      title="Sistema · Actividad"
      accent={SALA_COLORS.copper}
      headerRight={
        <span className="flex items-center gap-1.5 font-mono text-[9px] text-[var(--sala-text-dim)]">
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: fresh ? "var(--sala-gain)" : "var(--sala-loss)" }}
          />
          SNAPSHOT {snapshotAgeDays === null ? "—" : snapshotAgeDays === 0 ? "HOY" : `${snapshotAgeDays}D`}
        </span>
      }
    >
      {activity.length > 0 ? (
        <ul className="space-y-1.5">
          {activity.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 font-mono text-[10px]">
              <span className="w-16 shrink-0 truncate uppercase tracking-wider text-[var(--sala-copper)]">
                {entry.module}
              </span>
              <span className="truncate text-[var(--sala-text-dim)]">
                {entry.entity_name ?? entry.action}
              </span>
              <span className="ml-auto shrink-0 text-[var(--sala-text-dim)]">
                {timeAgo(entry.created_at)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pt-2 font-mono text-[10px] text-[var(--sala-text-dim)]">SIN ACTIVIDAD</p>
      )}
    </WidgetShell>
  );
}
