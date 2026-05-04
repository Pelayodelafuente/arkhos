"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MacroData } from "@/lib/mercados/macro";
import { ChartWrapper } from "../ChartWrapper";

interface Props {
  data: MacroData["fedBalance"];
}

const VIOLET = "var(--color-mercados)";

const TREND_CONFIG = {
  expanding: {
    label: "Expandiendo (QE)",
    icon: "↑",
    class: "bg-green-50 text-green-700 border-green-200",
    desc: "expandiéndose",
    impact: "QE (expansión) = más liquidez = favorable para activos de riesgo.",
  },
  contracting: {
    label: "Contrayendo (QT)",
    icon: "↓",
    class: "bg-red-50 text-red-700 border-red-200",
    desc: "contrayéndose",
    impact: "QT (contracción) = menos liquidez = viento en contra para crypto y growth.",
  },
  stable: {
    label: "Estable",
    icon: "→",
    class: "bg-gray-50 text-gray-600 border-gray-200",
    desc: "estable",
    impact: "Balance estable — liquidez sin cambios significativos.",
  },
} as const;

export function FedBalanceChart({ data }: Props) {
  const { current, history, trend } = data;
  const cfg = TREND_CONFIG[trend];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-secondary">Balance de la Fed</p>
          <p className="font-mono text-2xl font-bold text-foreground mt-0.5">
            ${current.toFixed(2)}T
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.class}`}
        >
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <ChartWrapper minHeight={160}>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={history} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="fedBalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={VIOLET} stopOpacity={0.2} />
              <stop offset="95%" stopColor={VIOLET} stopOpacity={0} />
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
            tickFormatter={(v: number) => `$${v.toFixed(1)}T`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value: unknown) => [
              `$${(value as number).toFixed(2)}T`,
              "Balance Fed",
            ]}
            contentStyle={{
              fontSize: 12,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={VIOLET}
            strokeWidth={2}
            fill="url(#fedBalGrad)"
          />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrapper>

      <p className="text-xs text-text-tertiary border-t border-border pt-3">
        El balance de la Fed se está{" "}
        <span className="font-semibold">{cfg.desc}</span>.{" "}
        {cfg.impact}
      </p>
    </div>
  );
}
