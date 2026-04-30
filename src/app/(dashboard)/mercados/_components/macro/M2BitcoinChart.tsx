"use client";

import { useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MacroData } from "@/lib/mercados/macro";

interface Props {
  data: MacroData["m2"];
}

const VIOLET = "var(--color-mercados)";
const AMBER = "var(--color-warning)";

type ViewMode = "level" | "yoy";

export function M2BitcoinChart({ data }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("level");
  const { current, yoyChange, history, btcHistory } = data;

  // Index M2 by YYYY-MM month
  const m2ByMonth = new Map(history.map((h) => [h.date.slice(0, 7), h.value]));

  // Compute M2 YoY growth per month
  const m2ByMonthArr = history.map((h) => ({ month: h.date.slice(0, 7), value: h.value }));
  const m2YoYMap = new Map<string, number>();
  m2ByMonthArr.forEach((h, i) => {
    if (i >= 12) {
      const prev = m2ByMonthArr[i - 12].value;
      if (prev !== 0) {
        m2YoYMap.set(
          h.month,
          parseFloat((((h.value - prev) / prev) * 100).toFixed(2)),
        );
      }
    }
  });

  // BTC history is already keyed as YYYY-MM
  const btcByMonth = new Map(btcHistory.map((h) => [h.date, h.value]));

  // Build combined dataset (last 60 months)
  const allMonths = [
    ...new Set([...m2ByMonth.keys(), ...btcByMonth.keys()]),
  ]
    .sort()
    .slice(-60);

  const chartData = allMonths.map((month) => ({
    month,
    m2Level: m2ByMonth.get(month) ?? null,
    m2YoY: m2YoYMap.get(month) ?? null,
    btc: btcByMonth.get(month) ?? null,
  }));

  const m2DataKey = viewMode === "level" ? "m2Level" : "m2YoY";
  const m2Label = viewMode === "level" ? "M2 (T$)" : "M2 YoY %";

  const m2TickFormatter =
    viewMode === "level"
      ? (v: number) => `$${v.toFixed(1)}T`
      : (v: number) => `${v.toFixed(1)}%`;

  const yoySign = yoyChange >= 0 ? "+" : "";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Insight card */}
      <div className="rounded-lg border border-border bg-sand p-3">
        <p className="text-xs text-text-secondary">
          <span className="font-semibold">Correlación M2 / Bitcoin</span> — Cuando el M2 global
          crece, Bitcoin tiende a subir 12-18 meses después. M2 actual YoY:{" "}
          <span className="font-mono font-bold">
            {yoySign}{yoyChange.toFixed(1)}%
          </span>.{" "}
          {yoyChange > 3
            ? "Expansión monetaria — contexto favorable para activos de riesgo."
            : yoyChange < 0
              ? "Contracción monetaria — viento en contra para crypto y growth."
              : "M2 estable — contexto neutral."}
        </p>
      </div>

      {/* Header + toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-secondary">M2 USA vs Bitcoin</p>
          <span className="font-mono text-xs text-text-tertiary">
            ${current.toFixed(1)}T · YoY{" "}
            <span className={yoyChange >= 0 ? "text-green-600" : "text-red-600"}>
              {yoySign}{yoyChange.toFixed(1)}%
            </span>
          </span>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border text-xs">
          {(["level", "yoy"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={[
                "px-3 py-1.5 font-medium transition-colors",
                viewMode === mode
                  ? "bg-mercados text-white"
                  : "bg-card text-text-secondary hover:bg-sand",
              ].join(" ")}
            >
              {mode === "level" ? "Nivel" : "YoY %"}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            strokeOpacity={0.5}
          />
          <XAxis dataKey="month" tick={false} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="m2"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={m2TickFormatter}
            domain={["auto", "auto"]}
          />
          <YAxis
            yAxisId="btc"
            orientation="right"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
            }
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value: unknown, name: string | number | undefined) => {
              if (value === null || value === undefined) return ["-", name];
              const numVal = value as number;
              if (name === m2Label) return [m2TickFormatter(numVal), name];
              return [`$${numVal.toLocaleString("en-US")}`, "Bitcoin"];
            }}
            contentStyle={{
              fontSize: 12,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          />
          <Legend iconType="line" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
          <Line
            yAxisId="m2"
            type="monotone"
            dataKey={m2DataKey}
            stroke={VIOLET}
            strokeWidth={2.5}
            dot={false}
            name={m2Label}
            connectNulls
          />
          <Line
            yAxisId="btc"
            type="monotone"
            dataKey="btc"
            stroke={AMBER}
            strokeWidth={1.5}
            dot={false}
            name="Bitcoin"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
