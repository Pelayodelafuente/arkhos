"use client";

import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";
import type { MintosInterestPoint } from "@/types/mintos";

const MINTOS_COLOR = "#C4704A";
const MINTOS_LIGHT = "#D9967A";
const LATE_COLOR = "#C8A84B";

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const interestIncome = payload.find((p) => p.name === "interest_income")?.value ?? 0;
  const buybackInterest = payload.find((p) => p.name === "buyback_interest")?.value ?? 0;
  const lateInterest = payload.find((p) => p.name === "late_interest")?.value ?? 0;
  const taxesWithheld = payload.find((p) => p.name === "taxes_withheld")?.value ?? 0;
  const gross = interestIncome + buybackInterest + lateInterest;

  return (
    <div
      className="rounded-xl px-4 py-3 space-y-1 text-sm min-w-[200px]"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <div className="flex justify-between gap-4">
        <span style={{ color: "var(--text-muted)" }}>Intereses regulares</span>
        <span className="font-mono tabular-nums" style={{ color: MINTOS_COLOR }}>
          {fmt(interestIncome)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: "var(--text-muted)" }}>Recompras</span>
        <span className="font-mono tabular-nums" style={{ color: MINTOS_LIGHT }}>
          {fmt(buybackInterest)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: "var(--text-muted)" }}>Retrasados</span>
        <span className="font-mono tabular-nums" style={{ color: LATE_COLOR }}>
          {fmt(lateInterest)}
        </span>
      </div>
      <div
        className="flex justify-between gap-4 pt-1 border-t"
        style={{ borderColor: "var(--border-stone, rgba(160,120,80,0.2))" }}
      >
        <span style={{ color: "var(--text-muted)" }}>Bruto</span>
        <span className="font-mono tabular-nums font-semibold" style={{ color: "var(--text-primary)" }}>
          {fmt(gross)}
        </span>
      </div>
      {taxesWithheld > 0 && (
        <div className="flex justify-between gap-4">
          <span style={{ color: "var(--text-muted)" }}>Retenciones</span>
          <span className="font-mono tabular-nums" style={{ color: "#A32D2D" }}>
            -{fmt(taxesWithheld)}
          </span>
        </div>
      )}
    </div>
  );
}

interface MintosInterestChartProps {
  data: MintosInterestPoint[];
}

export function MintosInterestChart({ data }: MintosInterestChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sin datos de intereses. Importa tu extracto mensual.
        </p>
      </div>
    );
  }

  const totalGross = data.reduce(
    (s, d) => s + d.interest_income + d.buyback_interest + d.late_interest,
    0
  );

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          Intereses por Mes
        </h3>
        <div className="text-right">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Total bruto acumulado
          </span>
          <p className="font-mono text-sm font-semibold tabular-nums" style={{ color: MINTOS_COLOR }}>
            {fmt(totalGross)}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-stone, rgba(160,120,80,0.15))"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--text-muted, #888780)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted, #888780)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}€`}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="interest_income" name="interest_income" stackId="a" fill={MINTOS_COLOR} radius={[0, 0, 0, 0]} />
          <Bar dataKey="buyback_interest" name="buyback_interest" stackId="a" fill={MINTOS_LIGHT} radius={[0, 0, 0, 0]} />
          <Bar dataKey="late_interest" name="late_interest" stackId="a" fill={LATE_COLOR} radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="taxes_withheld"
            name="taxes_withheld"
            stroke="#A32D2D"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: MINTOS_COLOR }} aria-hidden="true" />
          Intereses regulares
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: MINTOS_LIGHT }} aria-hidden="true" />
          Recompras
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LATE_COLOR }} aria-hidden="true" />
          Retrasados
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t border-dashed border-red-700" aria-hidden="true" />
          Retenciones
        </span>
      </div>
    </div>
  );
}
