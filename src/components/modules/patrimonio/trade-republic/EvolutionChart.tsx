"use client";

import { useId, useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { C } from "@/lib/patrimonio/chart-colors";
import type { EvolutionPoint } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toFixed(0);
};

const formatMonthYear = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
};

// ---------------------------------------------------------------------------
// Period selector
// ---------------------------------------------------------------------------

type Period = "1M" | "3M" | "6M" | "YTD" | "1A" | "Todo";

const PERIODS: { key: Period; label: string }[] = [
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "YTD", label: "YTD" },
  { key: "1A", label: "1A" },
  { key: "Todo", label: "Todo" },
];

function getCutoffDate(period: Period): string | null {
  const now = new Date();
  switch (period) {
    case "1M": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString().substring(0, 10);
    }
    case "3M": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d.toISOString().substring(0, 10);
    }
    case "6M": {
      const d = new Date(now);
      d.setDate(d.getDate() - 180);
      return d.toISOString().substring(0, 10);
    }
    case "YTD":
      return `${now.getFullYear()}-01-01`;
    case "1A": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString().substring(0, 10);
    }
    case "Todo":
      return null;
  }
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

const MSCI_WORLD_ANNUAL = 0.085;

interface EvolutionPointExtended extends EvolutionPoint {
  isToday?: boolean;
  benchmark?: number;
}

interface TooltipPayloadItem {
  payload: EvolutionPointExtended;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  pricesLastUpdated?: string | null;
  showBenchmark?: boolean;
}

function CustomTooltip({ active, payload, pricesLastUpdated, showBenchmark }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const plColor = point.pl >= 0 ? C.green : C.red;

  const dateLabel = point.isToday
    ? "Valor actual"
    : new Date(point.date).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const updatedLabel =
    point.isToday && pricesLastUpdated
      ? `· Actualizado ${new Date(pricesLastUpdated).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : null;

  const benchmarkDiff =
    showBenchmark && point.benchmark != null
      ? point.value - point.benchmark
      : null;

  return (
    <div
      className="rounded-xl border border-border px-3 py-2.5 text-xs"
      style={{ backgroundColor: "var(--bg-card)", boxShadow: "var(--shadow-modal)" }}
    >
      <p className="font-medium text-text-secondary">
        {dateLabel}
        {updatedLabel && (
          <span className="ml-1 font-normal text-text-tertiary">{updatedLabel}</span>
        )}
      </p>
      {point.isToday && <p className="mb-1.5 text-xs text-text-tertiary">En tiempo real</p>}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-text-tertiary">Valor</span>
          <span className="font-mono font-medium text-foreground">{formatEur(point.value)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-tertiary">Invertido</span>
          <span className="font-mono text-text-secondary">{formatEur(point.invested)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-tertiary">P&L</span>
          <span className="font-mono font-medium" style={{ color: plColor }}>
            {formatEur(point.pl)}
          </span>
        </div>
        {showBenchmark && point.benchmark != null && (
          <>
            <div className="mt-1 border-t border-border pt-1">
              <div className="flex justify-between gap-6">
                <span className="text-text-tertiary">MSCI World</span>
                <span className="font-mono text-text-secondary">{formatEur(point.benchmark)}</span>
              </div>
            </div>
            {benchmarkDiff !== null && (
              <div className="flex justify-between gap-6">
                <span className="text-text-tertiary">vs benchmark</span>
                <span className="font-mono font-medium" style={{ color: benchmarkDiff >= 0 ? C.green : C.red }}>
                  {benchmarkDiff >= 0 ? "+" : ""}{formatEur(benchmarkDiff)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

interface EvolutionChartProps {
  height?: number;
  showBenchmark?: boolean;
}

export function EvolutionChart({ height = 300, showBenchmark = false }: EvolutionChartProps) {
  const uid = useId();
  const gradValue = `gradValue-${uid}`;
  const gradInvested = `gradInvested-${uid}`;

  const snapshots = usePatrimonioStore((s) => s.snapshots);
  const getTRCurrentValue = usePatrimonioStore((s) => s.getTRCurrentValue);
  const pricesLastUpdated = usePatrimonioStore((s) => s.pricesLastUpdated);

  const [period, setPeriod] = useState<Period>("Todo");

  const currentTRValue = getTRCurrentValue();

  const data: EvolutionPointExtended[] = useMemo(() => {
    const cutoff = getCutoffDate(period);
    const base = snapshots
      .filter((s) => cutoff === null || s.snapshot_date >= cutoff)
      .map((s): EvolutionPointExtended => ({
        date: s.snapshot_date,
        value: s.total_value,
        invested: s.total_invested,
        pl: s.pl_amount ?? 0,
      }));

    // Append "today" point if we have a live price and it's not already in snapshots
    if (currentTRValue > 0) {
      const today = new Date().toISOString().substring(0, 10);
      const lastSnapshot = base[base.length - 1];
      if (!lastSnapshot || lastSnapshot.date !== today) {
        const lastInvested = lastSnapshot?.invested ?? 0;
        base.push({
          date: today,
          value: currentTRValue,
          invested: lastInvested,
          pl: currentTRValue - lastInvested,
          isToday: true,
        });
      }
    }

    // Compute cash-flow-adjusted MSCI World benchmark
    if (!showBenchmark || base.length === 0) return base;

    return base.reduce<EvolutionPointExtended[]>((acc, point, i) => {
      if (i === 0) {
        acc.push({ ...point, benchmark: point.invested });
        return acc;
      }
      const prev = acc[i - 1];
      const prevPoint = base[i - 1];
      const cashFlow = point.isToday ? 0 : point.invested - prevPoint.invested;
      const daysBetween =
        (new Date(point.date).getTime() - new Date(prev.date).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000);
      const newBenchmark =
        (prev.benchmark ?? point.invested) * Math.pow(1 + MSCI_WORLD_ANNUAL, daysBetween) + cashFlow;
      acc.push({ ...point, benchmark: newBenchmark });
      return acc;
    }, []);
  }, [snapshots, period, currentTRValue, showBenchmark]);

  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 text-center"
        style={{ height }}
      >
        <p className="text-sm font-medium text-text-secondary">Sin histórico de datos</p>
        <p className="max-w-xs text-xs text-text-tertiary">
          Los datos de evolución se irán generando automáticamente cada día.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Period selector */}
      <div className="mb-3 flex justify-end gap-1">
        {PERIODS.map(({ key, label }) => {
          const active = period === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className="rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? "var(--module-patrimonio)" : "var(--bg-sand)",
                color: active ? "#fff" : "var(--text-tertiary)",
                border: `1px solid ${active ? "var(--module-patrimonio)" : "var(--border)"}`,
              }}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>

      {showBenchmark && (
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: C.green }} />
            Tu cartera
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: C.gray }} />
            Capital invertido
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-5 rounded-full"
              style={{ backgroundColor: C.blue, borderTop: `2px dashed ${C.blue}` }}
            />
            MSCI World ~8.5%/año
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradValue} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.green} stopOpacity={0.15} />
              <stop offset="95%" stopColor={C.green} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={gradInvested} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.border} stopOpacity={0.4} />
              <stop offset="95%" stopColor={C.border} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatMonthYear}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip pricesLastUpdated={pricesLastUpdated} showBenchmark={showBenchmark} />} />
          <Area
            type="monotone"
            dataKey="invested"
            stroke={C.gray}
            strokeWidth={1.5}
            fill={`url(#${gradInvested})`}
            dot={false}
            activeDot={{ r: 4, fill: C.gray }}
            legendType="none"
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={C.green}
            strokeWidth={2}
            fill={`url(#${gradValue})`}
            dot={(props: {
              cx?: number;
              cy?: number;
              payload?: EvolutionPointExtended;
              index?: number;
            }) => {
              const { cx, cy, payload } = props;
              if (!payload?.isToday || cx == null || cy == null) return <Dot r={0} cx={0} cy={0} />;
              return (
                <Dot
                  key="today"
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={C.green}
                  stroke="var(--bg-card)"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 5, fill: C.green }}
            legendType="none"
          />
          {showBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke={C.blue}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4, fill: C.blue }}
              legendType="none"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
