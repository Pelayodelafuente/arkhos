"use client";

// Evolución del patrimonio total — datos de la megacarga (DashboardData)

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboardStore } from "@/stores/dashboard-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { fmtEur, monthShort } from "@/lib/sala/format";
import { WidgetShell, DeltaChip } from "./widget-shell";
import { SALA_TOOLTIP_STYLE, SALA_TICK, SALA_GRID_STROKE, type SalaWidgetProps } from "./types";

export function WidgetEvolucion({ width, height }: SalaWidgetProps) {
  const data = useDashboardStore((s) => s.data);

  const series = useMemo(() => {
    const snapshots = data?.initialSnapshots ?? [];
    return [...snapshots]
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      .map((s) => ({
        date: s.snapshot_date,
        label: monthShort(s.snapshot_date),
        valor: s.total_value,
        invertido: s.invested_value,
      }));
  }, [data]);

  const last = series[series.length - 1];
  const plPct =
    last && last.invertido > 0 ? ((last.valor - last.invertido) / last.invertido) * 100 : null;

  const chartH = Math.max(60, height - 46);

  return (
    <WidgetShell title="Patrimonio · Evolución" accent={MODULE_HEX.patrimonio}>
      <div className="flex items-baseline gap-2 pb-1">
        <span className="financial-number text-xl text-[var(--sala-text)]">
          {fmtEur(last?.valor ?? null)}
        </span>
        <DeltaChip value={plPct} />
      </div>
      {series.length > 1 ? (
        <AreaChart width={width} height={chartH} data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="sala-evo-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MODULE_HEX.patrimonio} stopOpacity={0.32} />
              <stop offset="100%" stopColor={MODULE_HEX.patrimonio} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={SALA_GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={SALA_TICK}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            isAnimationActive={false}
            contentStyle={SALA_TOOLTIP_STYLE}
            formatter={(value) => fmtEur(Number(value))}
          />
          <Area
            type="monotone"
            dataKey="invertido"
            stroke="#8A867E"
            strokeDasharray="4 3"
            strokeWidth={1}
            fill="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke={MODULE_HEX.patrimonio}
            strokeWidth={1.8}
            fill="url(#sala-evo-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <EmptyState />
      )}
    </WidgetShell>
  );
}

function EmptyState() {
  return (
    <p className="pt-4 font-mono text-[10px] text-[var(--sala-text-dim)]">SIN SNAPSHOTS</p>
  );
}
