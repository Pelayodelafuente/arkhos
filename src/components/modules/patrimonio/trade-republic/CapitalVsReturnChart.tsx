"use client";

import { useId, useMemo } from "react";
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
import { C } from "@/lib/patrimonio/chart-colors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatCompact = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
};

const formatMonthYear = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StackedPoint {
  date: string;
  capital: number;
  rentabilidad: number;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  payload: StackedPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const ratio =
    point.capital > 0 ? (point.rentabilidad / point.capital) * 100 : 0;
  const isPositive = point.rentabilidad >= 0;

  return (
    <div
      className="rounded-xl border border-border px-3 py-2.5 text-xs"
      style={{ backgroundColor: "var(--bg-card)", boxShadow: "var(--shadow-modal)" }}
    >
      <p className="mb-2 font-medium" style={{ color: "var(--text-secondary)" }}>
        {new Date(point.date).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span style={{ color: "var(--text-tertiary)" }}>Capital invertido</span>
          <span className="font-mono font-medium" style={{ color: "var(--foreground)" }}>
            {formatEur(point.capital)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span style={{ color: "var(--text-tertiary)" }}>Rentabilidad</span>
          <span
            className="font-mono font-medium"
            style={{ color: isPositive ? C.green : C.red }}
          >
            {isPositive ? "+" : ""}
            {formatEur(point.rentabilidad)}
          </span>
        </div>
        <div
          className="mt-1.5 border-t pt-1.5"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex justify-between gap-6">
            <span style={{ color: "var(--text-tertiary)" }}>Ratio rent./capital</span>
            <span
              className="font-mono font-semibold"
              style={{ color: isPositive ? C.green : C.red }}
            >
              {isPositive ? "+" : ""}
              {ratio.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

interface CapitalVsReturnChartProps {
  height?: number;
}

export function CapitalVsReturnChart({ height = 300 }: CapitalVsReturnChartProps) {
  const uid = useId();
  const gradCapital = `gradCapital-${uid}`;
  const gradReturn = `gradReturn-${uid}`;

  const snapshots = usePatrimonioStore((s) => s.snapshots);
  const getTRInvestmentValue = usePatrimonioStore((s) => s.getTRInvestmentValue);

  const currentTRValue = getTRInvestmentValue();

  // Deduplicate to one tick per calendar month (same pattern as EvolutionChart)
  // Include today's date when it falls in a new month to avoid visual gap at chart end
  const uniqueMonthTicks = useMemo(() => {
    const seen = new Set<string>();
    const dates = snapshots.map((s) => s.snapshot_date);
    if (currentTRValue > 0) {
      const today = new Date().toISOString().substring(0, 10);
      const lastDate = snapshots[snapshots.length - 1]?.snapshot_date ?? "";
      if (today.substring(0, 7) !== lastDate.substring(0, 7)) {
        dates.push(today);
      }
    }
    return dates.filter((date) => {
      const key = date.substring(0, 7);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [snapshots, currentTRValue]);

  const data: StackedPoint[] = useMemo(() => {
    const base = snapshots.map((s): StackedPoint => ({
      date: s.snapshot_date,
      capital: s.total_invested,
      rentabilidad: s.total_value - s.total_invested,
    }));

    // Append live "today" point if available
    if (currentTRValue > 0) {
      const today = new Date().toISOString().substring(0, 10);
      const last = base[base.length - 1];
      if (!last || last.date !== today) {
        const lastCapital = last?.capital ?? 0;
        base.push({
          date: today,
          capital: lastCapital,
          rentabilidad: currentTRValue - lastCapital,
        });
      }
    }

    return base;
  }, [snapshots, currentTRValue]);

  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 text-center"
        style={{ height }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Sin histórico de datos
        </p>
        <p className="max-w-xs text-xs" style={{ color: "var(--text-tertiary)" }}>
          Los datos de evolución se irán generando automáticamente cada día.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: C.blue, opacity: 0.5 }}
          />
          Capital invertido
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: C.green, opacity: 0.5 }}
          />
          Rentabilidad acumulada
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradCapital} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.blue} stopOpacity={0.35} />
              <stop offset="95%" stopColor={C.blue} stopOpacity={0.08} />
            </linearGradient>
            <linearGradient id={gradReturn} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.green} stopOpacity={0.4} />
              <stop offset="95%" stopColor={C.green} stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            ticks={uniqueMonthTicks}
            tickFormatter={formatMonthYear}
            tick={{
              fontSize: 11,
              fill: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCompact}
            domain={["auto", "auto"]}
            tick={{
              fontSize: 11,
              fill: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
            }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Capital — rendered first, below */}
          <Area
            type="monotone"
            dataKey="capital"
            stackId="stack"
            stroke={C.blue}
            strokeWidth={1.5}
            fill={`url(#${gradCapital})`}
            dot={false}
            activeDot={{ r: 4, fill: C.blue }}
            legendType="none"
          />
          {/* Rentabilidad — stacked on top */}
          <Area
            type="monotone"
            dataKey="rentabilidad"
            stackId="stack"
            stroke={C.green}
            strokeWidth={2}
            fill={`url(#${gradReturn})`}
            dot={false}
            activeDot={{ r: 5, fill: C.green }}
            legendType="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
