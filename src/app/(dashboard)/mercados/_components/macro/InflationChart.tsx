"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { MacroData } from "@/lib/mercados/macro";

interface Props {
  cpi: MacroData["cpi"];
  pce: MacroData["pce"];
}

const VIOLET = "var(--color-mercados)";
const VIOLET_MUTED = "rgba(114,96,196,0.45)";
const GREEN = "var(--color-success)";

export function InflationChart({ cpi, pce }: Props) {
  // Merge CPI and PCE history by date
  const cpiMap = new Map(cpi.history.map((h) => [h.date, h.value]));
  const pceMap = new Map(pce.history.map((h) => [h.date, h.value]));
  const allDates = [...new Set([...cpiMap.keys(), ...pceMap.keys()])].sort();

  const combined = allDates.map((date) => ({
    date,
    cpi: cpiMap.get(date) ?? null,
    pce: pceMap.get(date) ?? null,
  }));

  const aboveTarget = cpi.current > 2;
  const badgeColor = aboveTarget
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-green-50 text-green-700 border-green-200";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text-secondary">Inflación USA</p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}
        >
          CPI{" "}
          <span className="font-mono font-bold">{cpi.current.toFixed(1)}%</span>
          {" · "}
          PCE Core{" "}
          <span className="font-mono font-bold">{pce.current.toFixed(1)}%</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={combined} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            strokeOpacity={0.5}
          />
          <XAxis dataKey="date" tick={false} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            domain={[0, "auto"]}
          />
          <Tooltip
            formatter={(value: unknown, name: string | number | undefined) => {
              if (value === null || value === undefined) return ["-", name];
              const numVal = value as number;
              return [
                `${numVal.toFixed(2)}%`,
                name === "cpi" ? "CPI" : "PCE Core",
              ];
            }}
            contentStyle={{
              fontSize: 12,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          />
          <ReferenceLine
            y={2}
            stroke={GREEN}
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{
              value: "Objetivo Fed 2%",
              position: "insideTopLeft",
              fontSize: 10,
              fill: GREEN,
            }}
          />
          <Line
            type="monotone"
            dataKey="cpi"
            stroke={VIOLET}
            strokeWidth={2}
            dot={false}
            name="CPI"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pce"
            stroke={VIOLET_MUTED}
            strokeWidth={2}
            dot={false}
            name="PCE Core"
            strokeDasharray="4 2"
            connectNulls
          />
          <Legend iconType="line" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-text-tertiary border-t border-border pt-3">
        CPI en <span className="font-semibold">{cpi.current.toFixed(1)}%</span>,{" "}
        <span className="font-semibold">
          {Math.abs(cpi.vsTarget).toFixed(1)} pp{" "}
          {aboveTarget ? "por encima" : "por debajo"}
        </span>{" "}
        del objetivo del 2% de la Fed. PCE Core (favorito de la Fed) en{" "}
        <span className="font-semibold">{pce.current.toFixed(1)}%</span>.
      </p>
    </div>
  );
}
