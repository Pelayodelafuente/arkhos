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
import { ChartWrapper } from "../ChartWrapper";

interface Props {
  data: MacroData["fedFunds"];
}

const VIOLET = "var(--color-mercados)";

export function FedFundsChart({ data }: Props) {
  const { current, history, nextMeetingApprox } = data;

  const monthsStable = history.filter((h) => h.value === current).length;

  const showNextMeeting =
    nextMeetingApprox &&
    nextMeetingApprox !== "Por determinar" &&
    !isNaN(new Date(nextMeetingApprox).getTime());

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-secondary">Fed Funds Rate</p>
        <span className="font-mono text-2xl font-bold text-foreground tabular-nums">
          {current.toFixed(2)}%
        </span>
      </div>

      {showNextMeeting && (
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Próxima reunión Fed:{" "}
          <span className="font-medium text-text-secondary">
            {new Date(nextMeetingApprox).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      <ChartWrapper minHeight={160}>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fedGrad" x1="0" y1="0" x2="0" y2="1">
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
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            domain={[0, "auto"]}
          />
          <Tooltip
            formatter={(value: unknown) => [
              `${(value as number).toFixed(2)}%`,
              "Fed Funds",
            ]}
            contentStyle={{
              fontSize: 12,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          />
          <ReferenceLine
            y={current}
            stroke={VIOLET}
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{
              value: `${current.toFixed(2)}%`,
              position: "right",
              fontSize: 10,
              fill: VIOLET,
            }}
          />
          <Area
            type="stepAfter"
            dataKey="value"
            stroke={VIOLET}
            strokeWidth={2}
            fill="url(#fedGrad)"
          />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrapper>

      <p className="text-xs text-text-tertiary border-t border-border pt-3">
        El tipo actual del{" "}
        <span className="font-semibold">{current.toFixed(2)}%</span> es el coste
        del dinero en EE. UU. Tipos altos presionan acciones growth, crypto y bonos.
        {monthsStable > 1 && (
          <>
            {" "}La Fed lleva{" "}
            <span className="font-semibold">{monthsStable} meses</span> sin cambiar tipos.
          </>
        )}
      </p>
    </div>
  );
}
