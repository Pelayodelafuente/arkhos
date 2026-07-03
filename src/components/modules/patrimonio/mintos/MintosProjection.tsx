"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";
import { useMintosStore } from "@/stores/mintos-store";
import type { MintosKPIs, MintosPlan } from "@/types/mintos";

const MINTOS_COLOR = "var(--accent-terracotta)";

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const projected = payload.find((p) => p.name === "projected_value")?.value ?? 0;
  const contributed = payload.find((p) => p.name === "total_contributed")?.value ?? 0;
  const interest = projected - contributed;

  return (
    <div
      className="rounded-xl px-4 py-3 space-y-1 text-sm"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <div className="flex justify-between gap-4">
        <span style={{ color: "var(--text-muted)" }}>Valor proyectado</span>
        <span className="font-mono tabular-nums" style={{ color: MINTOS_COLOR }}>
          {fmt(projected)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: "var(--text-muted)" }}>Capital aportado</span>
        <span className="font-mono tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {fmt(contributed)}
        </span>
      </div>
      <div
        className="flex justify-between gap-4 pt-1 border-t"
        style={{ borderColor: "var(--border-stone, rgba(160,120,80,0.2))" }}
      >
        <span style={{ color: "var(--text-muted)" }}>Intereses generados</span>
        <span className="font-mono tabular-nums font-semibold" style={{ color: "#3B7A57" }}>
          {fmt(interest)}
        </span>
      </div>
    </div>
  );
}

const YEAR_OPTIONS = [1, 3, 5] as const;

interface MintosProjectionProps {
  kpis: MintosKPIs | null;
  plan: MintosPlan | null;
}

export function MintosProjection({ kpis, plan }: MintosProjectionProps) {
  const getProjection = useMintosStore((s) => s.getProjection);

  const defaultXirr = kpis?.xirr ?? 8.6;
  const defaultMonthly = plan?.monthly_amount ?? 50;

  const [years, setYears] = useState<1 | 3 | 5>(5);
  const [xirr, setXirr] = useState(defaultXirr);
  const [monthly, setMonthly] = useState(defaultMonthly);

  const data = getProjection(years, xirr, monthly);

  return (
    <div
      className="rounded-xl p-5 space-y-5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
        Proyección de Crecimiento
      </h3>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Year selector */}
        <div className="flex gap-1">
          {YEAR_OPTIONS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYears(y)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150"
              style={
                years === y
                  ? {
                      backgroundColor: `color-mix(in srgb, ${MINTOS_COLOR} 12%, transparent)`,
                      color: MINTOS_COLOR,
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              {y} {y === 1 ? "año" : "años"}
            </button>
          ))}
        </div>

        {/* XIRR input */}
        <label className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-muted)" }}>XIRR</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={xirr}
              onChange={(e) => setXirr(parseFloat(e.target.value) || 0)}
              min={0}
              max={30}
              step={0.1}
              className="w-16 rounded-lg px-2 py-1 font-mono text-sm text-right tabular-nums"
              style={{
                backgroundColor: "var(--bg-page)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
                outline: "none",
              }}
              aria-label="XIRR anual estimado"
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>%</span>
          </div>
        </label>

        {/* Monthly contribution */}
        <label className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-muted)" }}>Aportación/mes</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(parseFloat(e.target.value) || 0)}
              min={0}
              step={10}
              className="w-20 rounded-lg px-2 py-1 font-mono text-sm text-right tabular-nums"
              style={{
                backgroundColor: "var(--bg-page)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
                outline: "none",
              }}
              aria-label="Aportación mensual"
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>€</span>
          </div>
        </label>
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mintosProjectionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={MINTOS_COLOR} stopOpacity={0.18} />
                <stop offset="95%" stopColor={MINTOS_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-stone, rgba(160,120,80,0.15))"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--text-muted, var(--text-muted))", fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-muted, var(--text-muted))", fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total_contributed"
              name="total_contributed"
              stroke="var(--text-muted)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="none"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="projected_value"
              name="projected_value"
              stroke={MINTOS_COLOR}
              strokeWidth={2}
              fill="url(#mintosProjectionFill)"
              dot={{ r: 4, fill: MINTOS_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: MINTOS_COLOR, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Sin datos base para proyectar.
          </p>
        </div>
      )}

      {/* Table */}
      {data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.2))" }}>
                <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--text-muted)" }}>
                  Año
                </th>
                <th className="text-right py-2 px-4 font-medium" style={{ color: "var(--text-muted)" }}>
                  Valor proyectado
                </th>
                <th className="text-right py-2 px-4 font-medium" style={{ color: "var(--text-muted)" }}>
                  Capital aportado
                </th>
                <th className="text-right py-2 pl-4 font-medium" style={{ color: "var(--text-muted)" }}>
                  Intereses
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.year}
                  style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.1))" }}
                >
                  <td className="py-2 pr-4 font-medium" style={{ color: "var(--text-secondary)" }}>
                    {row.label}
                  </td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums" style={{ color: MINTOS_COLOR }}>
                    {fmt(row.projected_value)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {fmt(row.total_contributed)}
                  </td>
                  <td className="py-2 pl-4 text-right font-mono tabular-nums" style={{ color: "#3B7A57" }}>
                    +{fmt(row.interest_earned)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
