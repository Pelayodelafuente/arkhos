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
import type { MacroData } from "@/lib/mercados/macro";

const C = {
  violet: "var(--color-mercados)",
  red: "var(--color-error)",
  green: "var(--color-success)",
  amber: "var(--color-warning)",
} as const;

interface Props {
  data: MacroData["yieldCurve"];
}

export function YieldCurveChart({ data }: Props) {
  const { points, spread10y2y, isInverted, history } = data;
  const curveColor = isInverted ? C.red : C.violet;

  const badgeClass = isInverted
    ? "bg-red-50 text-red-700 border-red-200"
    : spread10y2y > 0.5
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  const badgeLabel = isInverted
    ? "⚠ CURVA INVERTIDA — Señal histórica de recesión"
    : spread10y2y > 0.5
      ? "Curva normal"
      : "Aplanada — Vigilar";

  const spreadSign = spread10y2y >= 0 ? "+" : "";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-secondary">Curva de Tipos USA</p>
          <p className="font-mono text-xs text-text-tertiary mt-0.5">
            Spread 10Y-2Y:{" "}
            <span className="font-semibold text-foreground">
              {spreadSign}{spread10y2y.toFixed(3)}%
            </span>
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Pills de yields actuales */}
      <div className="flex flex-wrap gap-2">
        {points.map((p) => (
          <div
            key={p.maturity}
            className="flex flex-col items-center rounded-lg border border-border bg-sand px-3 py-1.5"
          >
            <span className="text-[10px] font-medium text-text-tertiary">{p.maturity}</span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {p.yield.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {/* Curva actual */}
      <div>
        <p className="mb-1.5 text-xs text-text-tertiary">Curva actual</p>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={curveColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={curveColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="maturity"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(value: unknown) => [
                `${(value as number).toFixed(2)}%`,
                "Yield",
              ]}
              contentStyle={{
                fontSize: 12,
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="yield"
              stroke={curveColor}
              strokeWidth={2}
              fill="url(#curveGrad)"
              dot={{ r: 4, fill: curveColor, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Spread histórico */}
      <div>
        <p className="mb-1.5 text-xs text-text-tertiary">Spread 10Y-2Y histórico</p>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spreadPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.green} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="spreadNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.red} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.red} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(value: unknown) => [
                `${(value as number).toFixed(3)}%`,
                "Spread 10Y-2Y",
              ]}
              contentStyle={{
                fontSize: 12,
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            />
            <ReferenceLine
              y={0}
              stroke={C.red}
              strokeDasharray="4 2"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isInverted ? C.red : C.violet}
              strokeWidth={1.5}
              fill={isInverted ? "url(#spreadNeg)" : "url(#spreadPos)"}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Explicación */}
      <p className="text-xs text-text-tertiary border-t border-border pt-3">
        El spread 10Y-2Y está en{" "}
        <span className="font-semibold">
          {spreadSign}{spread10y2y.toFixed(3)}%
        </span>.{" "}
        {isInverted
          ? "La curva está invertida — históricamente, esto precede una recesión en 12-24 meses."
          : "Curva en pendiente positiva — señal de crecimiento económico esperado."}
      </p>
    </div>
  );
}
