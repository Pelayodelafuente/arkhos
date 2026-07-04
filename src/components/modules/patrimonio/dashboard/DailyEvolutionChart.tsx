"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { formatEur, formatEurShort } from "@/lib/utils/format";
import { ChartShell, ChartTooltip } from "@/components/viz";
import type { ChartTooltipProps } from "@/components/viz";

// ---------------------------------------------------------------------------
// DailyEvolutionChart — patrimonio GLOBAL día a día
// Fuente: filas platform_id NULL de portfolio_snapshots, generadas por el
// cron diario (run_daily_global_snapshots) y tras cada mutación.
// La serie empieza el 2026-07-03 (primer snapshot) y se densifica sola.
// ---------------------------------------------------------------------------

type Period = "30D" | "90D" | "1A" | "Todo";
const PERIODS: Period[] = ["30D", "90D", "1A", "Todo"];
const PERIOD_DAYS: Record<Exclude<Period, "Todo">, number> = { "30D": 30, "90D": 90, "1A": 365 };

// 'YYYY-MM-DD' → 'DD/MM'
function dayLabel(date: string): string {
  return `${date.substring(8, 10)}/${date.substring(5, 7)}`;
}

export function DailyEvolutionChart() {
  const dailySnapshots = usePatrimonioStore((s) => s.dailySnapshots);
  const [period, setPeriod] = useState<Period>("90D");

  const data = useMemo(() => {
    let rows = dailySnapshots;
    if (period !== "Todo") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);
      const cutoffStr = cutoff.toISOString().substring(0, 10);
      rows = rows.filter((s) => s.snapshot_date >= cutoffStr);
    }
    return rows.map((s) => ({
      date: s.snapshot_date,
      label: dayLabel(s.snapshot_date),
      Valor: s.total_value,
      Invertido: s.total_invested,
    }));
  }, [dailySnapshots, period]);

  // La serie diaria nace hoy: hasta tener ≥2 puntos no hay línea que pintar
  if (dailySnapshots.length < 2) return null;

  const first = data[0]?.Valor ?? 0;
  const last = data[data.length - 1]?.Valor ?? 0;
  const delta = last - first;
  const deltaPct = first > 0 ? (delta / first) * 100 : 0;
  const positive = delta >= 0;

  return (
    <ChartShell
      title="Evolución diaria"
      subtitle="Patrimonio global, snapshot automático cada mañana"
      actions={
        <div className="flex items-center gap-2">
          {data.length >= 2 && (
            <span
              className="financial-number text-xs font-semibold"
              style={{ color: positive ? "var(--color-gain)" : "var(--color-loss)" }}
            >
              {positive ? "▲" : "▼"} {formatEur(Math.abs(delta))} ({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(2)}%)
            </span>
          )}
          <div className="flex rounded-lg border border-border bg-sand p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  period === p ? "bg-card text-foreground" : "text-text-tertiary hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="dailyGlobalValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--module-patrimonio)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--module-patrimonio)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-subtle)" }}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(v: number) => formatEurShort(v)}
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  {...(props as unknown as ChartTooltipProps)}
                  labelFormatter={(l) => String(l)}
                  valueFormatter={(v) => formatEur(v)}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="Invertido"
              stroke="var(--text-faint)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
              dot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="Valor"
              stroke="var(--module-patrimonio)"
              strokeWidth={2}
              fill="url(#dailyGlobalValue)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}
