"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const formatCompact = (v: number) =>
  new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 0 }).format(v);

interface EvolutionPoint {
  label: string;
  monthKey: string;
  invested: number;
  current_value: number | null;
}

function buildEvolutionData(
  transactions: ReturnType<ReturnType<typeof useCryptoStore.getState>["getTransactionsWithAsset"]>,
  currentTotalValue: number | null,
): EvolutionPoint[] {
  const buys = transactions
    .filter((tx) => tx.type === "buy" && tx.transaction_date)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  if (buys.length === 0) return [];

  // Aggregate buy amounts by calendar month (YYYY-MM)
  const byMonth = new Map<string, { label: string; amount: number }>();

  for (const tx of buys) {
    const date = new Date(tx.transaction_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
    const existing = byMonth.get(key);
    byMonth.set(key, {
      label,
      amount: (existing?.amount ?? 0) + (tx.amount_eur ?? 0),
    });
  }

  // Build cumulative series sorted by month key
  const sorted = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));

  let cumulative = 0;
  const points: EvolutionPoint[] = sorted.map(([key, { label, amount }], idx) => {
    cumulative += amount;
    const isLast = idx === sorted.length - 1;
    return {
      label,
      monthKey: key,
      invested: parseFloat(cumulative.toFixed(2)),
      current_value: isLast && currentTotalValue !== null ? currentTotalValue : null,
    };
  });

  return points;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string; dataKey: string }>;
  label?: string;
}

function EvolutionTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const invested = payload.find((p) => p.dataKey === "invested");
  const value = payload.find((p) => p.dataKey === "current_value" && p.value !== null);

  return (
    <div
      className="rounded-lg p-3 text-xs space-y-1.5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        color: "var(--text-primary)",
        minWidth: "175px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      }}
    >
      <p className="font-medium text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {invested && (
        <p className="font-mono flex justify-between gap-4">
          <span style={{ color: "#B07A3A" }}>Invertido</span>
          <span>{formatEur(invested.value ?? 0)}</span>
        </p>
      )}
      {value && (
        <p className="font-mono flex justify-between gap-4">
          <span style={{ color: "#2E7D6B" }}>Valor hoy</span>
          <span>{formatEur(value.value ?? 0)}</span>
        </p>
      )}
      {value && invested && (
        <>
          <div style={{ borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.15))", margin: "4px 0" }} />
          <p className="font-mono flex justify-between gap-4">
            <span style={{ color: "var(--text-muted)" }}>P&L</span>
            <span
              style={{
                color:
                  (value.value ?? 0) >= (invested.value ?? 0)
                    ? "#2E7D6B"
                    : "#A32D2D",
              }}
            >
              {(value.value ?? 0) >= (invested.value ?? 0) ? "+" : ""}
              {formatEur((value.value ?? 0) - (invested.value ?? 0))}
            </span>
          </p>
        </>
      )}
    </div>
  );
}

export function CryptoEvolutionChart() {
  const isLoading = useCryptoStore((s) => s.isLoading);
  const assets = useCryptoStore((s) => s.assets);
  const defiPositions = useCryptoStore((s) => s.defiPositions);
  const monthlyPlan = useCryptoStore((s) => s.monthlyPlan);
  const getOverview = useCryptoStore((s) => s.getOverview);
  const getTransactionsWithAsset = useCryptoStore((s) => s.getTransactionsWithAsset);

  const overview = useMemo(
    () => getOverview(),
    [assets, defiPositions, monthlyPlan, getOverview],
  );
  const txs = getTransactionsWithAsset();
  const data = useMemo(
    () => buildEvolutionData(txs, overview?.total_value_eur ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txs.length, overview?.total_value_eur],
  );

  if (isLoading) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  if (data.length < 2) {
    return (
      <div
        className="rounded-xl p-6 flex items-center justify-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          minHeight: "320px",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-sm">Datos insuficientes para mostrar la evolución del portfolio.</p>
      </div>
    );
  }

  const lastPoint = data[data.length - 1];
  const plEur =
    lastPoint.current_value !== null
      ? lastPoint.current_value - lastPoint.invested
      : null;
  const plPct =
    plEur !== null && lastPoint.invested > 0
      ? (plEur / lastPoint.invested) * 100
      : null;

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
            Evolución del portfolio
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Coste acumulado · valor actual en el último punto
          </p>
        </div>
        {lastPoint.current_value !== null && (
          <div className="text-right flex-shrink-0">
            <p className="font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {formatEur(lastPoint.current_value)}
            </p>
            {plEur !== null && plPct !== null && (
              <p
                className="font-mono text-xs tabular-nums"
                style={{ color: plEur >= 0 ? "#2E7D6B" : "#A32D2D" }}
              >
                {plEur >= 0 ? "+" : ""}
                {formatEur(plEur)} ({plPct >= 0 ? "+" : ""}
                {plPct.toFixed(2)}%)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full" style={{ backgroundColor: "#B07A3A" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Coste acumulado
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-4 rounded-full"
            style={{ backgroundColor: "#2E7D6B" }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Valor actual (hoy)
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradInvCrypto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B07A3A" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#B07A3A" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCompact}
            width={52}
          />
          <Tooltip content={<EvolutionTooltip />} />

          {/* Cost basis area */}
          <Area
            type="stepAfter"
            dataKey="invested"
            name="Invertido"
            stroke="#B07A3A"
            strokeWidth={1.75}
            fill="url(#gradInvCrypto)"
            dot={false}
            activeDot={{ r: 3, fill: "#B07A3A" }}
            connectNulls={false}
          />

          {/* Current value dot at the last point */}
          <Line
            type="monotone"
            dataKey="current_value"
            name="Valor actual"
            stroke="#2E7D6B"
            strokeWidth={0}
            dot={(props: { cx?: number; cy?: number; payload?: EvolutionPoint }) => {
              if (props.payload?.current_value == null) return <g key="empty" />;
              return (
                <circle
                  key={`dot-${props.cx}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={6}
                  fill="#2E7D6B"
                  stroke="var(--bg-card)"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={false}
            connectNulls={false}
          />

          {/* P&L reference line when current value is above invested */}
          {lastPoint.current_value !== null && lastPoint.current_value !== lastPoint.invested && (
            <ReferenceLine
              y={lastPoint.invested}
              stroke="#B07A3A"
              strokeDasharray="3 3"
              strokeOpacity={0.35}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
