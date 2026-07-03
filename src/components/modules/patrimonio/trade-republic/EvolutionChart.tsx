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
  Brush,
  ReferenceLine,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { C } from "@/lib/patrimonio/chart-colors";
import type { EvolutionPoint } from "@/types/patrimonio";

import { formatEur } from "@/lib/utils/format";

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
  totalValue?: number; // portfolio value including cash (E-01)
  periodChangePct?: number | null; // rentabilidad acumulada: P&L / capital_invertido (PAT-02)
}

interface TooltipPayloadItem {
  payload: EvolutionPointExtended;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  pricesLastUpdated?: string | null;
  showBenchmark?: boolean;
  showTotal?: boolean;
}

function CustomTooltip({ active, payload, pricesLastUpdated, showBenchmark, showTotal }: CustomTooltipProps) {
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
          <span className="text-text-tertiary">Cartera</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-medium text-foreground">{formatEur(point.value)}</span>
            {point.periodChangePct != null && (
              <span
                className="font-mono text-[10px] font-medium"
                style={{ color: point.periodChangePct >= 0 ? C.green : C.red }}
              >
                {point.periodChangePct >= 0 ? "+" : ""}{point.periodChangePct.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        {showTotal && point.totalValue != null && (
          <div className="flex justify-between gap-6">
            <span className="text-text-tertiary">Patrimonio total</span>
            <span className="font-mono text-text-secondary">{formatEur(point.totalValue)}</span>
          </div>
        )}
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
  showTotal?: boolean; // show patrimonio total (incl. cash) line
}

export function EvolutionChart({ height = 300, showBenchmark = false, showTotal: showTotalProp }: EvolutionChartProps) {
  const [showTotal, setShowTotal] = useState(showTotalProp ?? false);
  const uid = useId();
  const gradValue = `gradValue-${uid}`;
  const gradInvested = `gradInvested-${uid}`;

  const allSnapshots = usePatrimonioStore((s) => s.snapshots);
  const platforms = usePatrimonioStore((s) => s.platforms);
  const getTRInvestmentValue = usePatrimonioStore((s) => s.getTRInvestmentValue);
  const getTRCurrentValue = usePatrimonioStore((s) => s.getTRCurrentValue);
  const pricesLastUpdated = usePatrimonioStore((s) => s.pricesLastUpdated);

  // Filter to Trade Republic snapshots only (store holds all platforms)
  const trPlatformId = platforms.find((p) => p.slug === "trade-republic")?.id;
  const snapshots = trPlatformId
    ? allSnapshots.filter((s) => s.platform_id === trPlatformId)
    : allSnapshots;

  const [period, setPeriod] = useState<Period>("Todo");

  const currentTRValue = getTRInvestmentValue();
  const currentTRTotal = getTRCurrentValue(); // includes cash

  // Deduplicate X-axis ticks to one per calendar month (BUG-06)
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

  const data: EvolutionPointExtended[] = useMemo(() => {
    const cutoff = getCutoffDate(period);
    const currentMonth = new Date().toISOString().substring(0, 7);

    // One point per month (last snapshot of each month), skipping current month
    // — current month is always represented by the live "today" point below
    const monthMap = new Map<string, EvolutionPointExtended>();
    snapshots
      .filter((s) => (cutoff === null || s.snapshot_date >= cutoff) && s.total_value > 0)
      .forEach((s) => {
        const month = s.snapshot_date.substring(0, 7);
        if (month !== currentMonth) {
          monthMap.set(month, {
            date: s.snapshot_date,
            value: s.total_value,
            invested: s.total_invested,
            pl: s.pl_amount ?? 0,
            totalValue: s.total_value + (s.cash_value ?? 0),
          });
        }
      });
    const base = Array.from(monthMap.values());

    // Append "today" point if we have a live price
    if (currentTRValue > 0) {
      const today = new Date().toISOString().substring(0, 10);
      const lastSnapshot = base[base.length - 1];
      const lastInvested = lastSnapshot?.invested ?? 0;
      base.push({
        date: today,
        value: currentTRValue,
        invested: lastInvested,
        pl: currentTRValue - lastInvested,
        totalValue: currentTRTotal,
        isToday: true,
      });
    }

    // Rentabilidad acumulada = P&L / capital_invertido (PAT-02, PAT-03)
    // No se usa el primer punto como base porque produce % inflados cuando
    // el capital inicial es pequeño y el signo puede contradecir el P&L.
    base.forEach((p) => {
      p.periodChangePct = p.invested > 0 ? ((p.value - p.invested) / p.invested) * 100 : null;
    });

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
  }, [snapshots, period, currentTRValue, currentTRTotal, showBenchmark]);

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
      {/* Controls row: toggle total + period selector */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowTotal((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
          style={{
            backgroundColor: showTotal ? "rgba(59,120,176,0.12)" : "var(--bg-sand)",
            color: showTotal ? "var(--module-gastos)" : "var(--text-tertiary)",
            border: `1px solid ${showTotal ? "rgba(59,120,176,0.3)" : "var(--border)"}`,
          }}
          aria-pressed={showTotal}
        >
          {showTotal ? "Ocultar" : "Mostrar"} patrimonio total
        </button>
        <div className="flex gap-1">
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
      </div>

      {/* Legend for total line */}
      {showTotal && (
        <div className="mb-3 flex items-center gap-4 text-xs text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: "var(--module-gastos)" }} />
            Patrimonio total (con efectivo)
          </span>
        </div>
      )}

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
      <ResponsiveContainer width="100%" height={height + 30}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
            ticks={uniqueMonthTicks}
            tickFormatter={formatMonthYear}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCompact}
            domain={["auto", "auto"]}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip pricesLastUpdated={pricesLastUpdated} showBenchmark={showBenchmark} showTotal={showTotal} />} />
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
          {showTotal && (
            <Line
              type="monotone"
              dataKey="totalValue"
              stroke="var(--module-gastos)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 4, fill: "var(--module-gastos)" }}
              legendType="none"
            />
          )}
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
          {period !== "YTD" && (() => {
            const ytdDate = `${new Date().getFullYear()}-01-01`;
            const hasYtd = data.some(p => p.date >= ytdDate);
            if (!hasYtd) return null;
            return (
              <ReferenceLine
                x={ytdDate}
                stroke="var(--text-tertiary)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                label={{
                  value: "YTD",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "var(--text-tertiary)",
                }}
              />
            );
          })()}
          <Brush
            dataKey="date"
            height={20}
            stroke="var(--border)"
            fill="var(--bg-sand, var(--bg-card))"
            travellerWidth={6}
            tickFormatter={formatMonthYear}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
