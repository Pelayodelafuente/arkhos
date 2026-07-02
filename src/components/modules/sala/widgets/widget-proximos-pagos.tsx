"use client";

// Próximos pagos — suscripciones activas de la megacarga

import { useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { fmtEur, dayMonth } from "@/lib/sala/format";
import { WidgetShell } from "./widget-shell";
import type { SalaWidgetProps } from "./types";

interface UpcomingPayment {
  id: string;
  name: string;
  amount: number;
  date: Date;
}

export function WidgetProximosPagos({ height }: SalaWidgetProps) {
  const data = useDashboardStore((s) => s.data);

  const upcoming = useMemo<UpcomingPayment[]>(() => {
    const subs = data?.initialSubscriptions ?? [];
    const today = new Date();
    return subs
      .filter((s) => s.billing_day !== undefined && s.billing_day !== null)
      .map((s) => {
        const day = s.billing_day as number;
        const date = new Date(today.getFullYear(), today.getMonth(), day);
        if (date < today) date.setMonth(date.getMonth() + 1);
        return { id: s.id, name: s.name, amount: s.amount, date };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  const maxRows = Math.max(3, Math.floor((height - 8) / 26));
  const rows = upcoming.slice(0, maxRows);

  return (
    <WidgetShell title="Gastos · Próximos pagos" accent={MODULE_HEX.gastos}>
      {rows.length > 0 ? (
        <ul className="space-y-1.5">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center gap-2 font-mono text-[11px]">
              <span className="w-12 shrink-0 text-[var(--sala-copper)]">{dayMonth(p.date)}</span>
              <span className="truncate text-[var(--sala-text-dim)]">{p.name}</span>
              <span className="financial-number ml-auto text-[var(--sala-text)]">
                {fmtEur(p.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pt-2 font-mono text-[10px] text-[var(--sala-text-dim)]">SIN SUSCRIPCIONES</p>
      )}
    </WidgetShell>
  );
}
