"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { CommoditiesData } from "@/lib/mercados/assets";

const C = {
  violet: "var(--color-mercados)",
  terracota: "var(--color-terracota)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
} as const;

interface Props {
  data: CommoditiesData;
  isLoading: boolean;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card animate-pulse ${className}`} />
  );
}

function ChangeBadge({ pct }: { pct: number }) {
  const pos = pct >= 0;
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        pos
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200",
      ].join(" ")}
    >
      {pos ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}

function Sparkline({
  data,
  color,
  gradientId,
}: {
  data: Array<{ date: string; value: number }>;
  color: string;
  gradientId: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <Tooltip
          formatter={(v: unknown) => [`$${(v as number).toLocaleString("en-US")}`, ""]}
          contentStyle={{
            fontSize: 12,
            border: "1px solid var(--color-border)",
            borderRadius: 8,
          }}
          labelFormatter={(label) => String(label)}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function gsrSignalBadge(signal: CommoditiesData["gsr"]["signal"]) {
  if (signal === "buy_silver") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Acumular plata (ISLN)
      </span>
    );
  }
  if (signal === "buy_gold") {
    return (
      <span
        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: C.violet, borderColor: C.violet }}
      >
        Acumular oro (IGLN)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-sand px-2.5 py-0.5 text-xs font-medium text-text-secondary">
      Sin señal clara
    </span>
  );
}

export function CommoditiesSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-44" />
      </div>
    );
  }

  const { gold, silver, oil, gsr, realYield } = data;

  const metals = [
    { key: "gold", label: "Oro", unit: "USD/oz", data: gold, color: C.warning, gradId: "goldGrad" },
    { key: "silver", label: "Plata", unit: "USD/oz", data: silver, color: C.terracota, gradId: "silverGrad" },
    { key: "oil", label: "Petróleo WTI", unit: "USD/bbl", data: oil, color: "#9B7A4A", gradId: "oilGrad" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Fila 1: Metales + Petróleo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metals.map(({ key, label, unit, data: d, color, gradId }) => (
          <div key={key} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-text-tertiary">{unit}</p>
              </div>
              <ChangeBadge pct={d.changePct24h} />
            </div>
            <p className="font-mono text-2xl font-bold text-foreground tabular-nums">
              ${d.price.toLocaleString("en-US")}
            </p>
            <Sparkline data={d.history} color={color} gradientId={gradId} />
          </div>
        ))}
      </div>

      {/* Fila 2: GSR */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-secondary">Ratio Oro / Plata (GSR)</p>
            <p className="font-mono text-3xl font-bold text-foreground tabular-nums mt-0.5">
              {gsr.current.toFixed(2)}
            </p>
          </div>
          {gsrSignalBadge(gsr.signal)}
        </div>

        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={gsr.history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gsrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.warning} stopOpacity={0.2} />
                <stop offset="95%" stopColor={C.warning} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="date" tick={false} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(v: unknown) => [`${(v as number).toFixed(2)}`, "GSR"]}
              contentStyle={{
                fontSize: 12,
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
              labelFormatter={(label) => String(label)}
            />
            <ReferenceLine y={55} stroke={C.violet} strokeDasharray="4 2" strokeWidth={1} label={{ value: "55", position: "right", fontSize: 10, fill: C.violet }} />
            <ReferenceLine y={85} stroke={C.error} strokeDasharray="4 2" strokeWidth={1} label={{ value: "85", position: "right", fontSize: 10, fill: C.error }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={C.warning}
              strokeWidth={2}
              fill="url(#gsrGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        <p className="text-xs text-text-tertiary border-t border-border pt-3">
          {gsr.signalMessage}
        </p>
      </div>

      {/* Fila 3: Real Yield */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-secondary">Real Yield (TIPS 10Y)</p>
            <p className="font-mono text-2xl font-bold text-foreground tabular-nums mt-0.5">
              {realYield.current.toFixed(2)}%
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={realYield.history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.success} stopOpacity={0.2} />
                <stop offset="95%" stopColor={C.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="date" tick={false} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, "Real Yield"]}
              contentStyle={{
                fontSize: 12,
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
              labelFormatter={(label) => String(label)}
            />
            <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={C.success}
              strokeWidth={2}
              fill="url(#ryGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        <p className="text-xs text-text-tertiary border-t border-border pt-3">
          Correlación inversa con el oro. Real yield alto = presión bajista para el oro.
        </p>
      </div>
    </div>
  );
}
