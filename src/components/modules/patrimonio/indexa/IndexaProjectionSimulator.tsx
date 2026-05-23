"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { IndexaProjectionPoint } from "@/types/indexa";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const formatYAxis = (v: number) => {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k€`;
  return `${v}€`;
};

const YEAR_OPTIONS = [1, 3, 5, 10] as const;
type YearOption = (typeof YEAR_OPTIONS)[number];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const contributed = payload.find((p) => p.name === "total_contributed")?.value ?? 0;
  const interest = payload.find((p) => p.name === "interest_earned")?.value ?? 0;
  const total = contributed + Math.max(0, interest);

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs font-mono space-y-1"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        color: "var(--text-primary)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p>
        <span style={{ color: "var(--text-muted)" }}>Aportado: </span>
        {formatEur(contributed)}
      </p>
      <p style={{ color: "#3B78B0" }}>
        <span style={{ color: "var(--text-muted)" }}>Intereses: </span>
        {formatEur(Math.max(0, interest))}
      </p>
      <p className="font-semibold pt-1 border-t" style={{ borderColor: "var(--border-stone, rgba(160,120,80,0.25))" }}>
        Total: {formatEur(total)}
      </p>
    </div>
  );
}

interface IndexaProjectionSimulatorProps {
  getProjection: (years: number, annualReturn: number, monthlyContrib: number) => IndexaProjectionPoint[];
  defaultMonthlyContrib?: number;
}

export function IndexaProjectionSimulator({
  getProjection,
  defaultMonthlyContrib = 152,
}: IndexaProjectionSimulatorProps) {
  const [years, setYears] = useState<YearOption>(() => {
    if (typeof window === "undefined") return 10;
    const stored = localStorage.getItem("arkhos_sim_indexa_years");
    const parsed = Number(stored) as YearOption;
    return stored !== null && (YEAR_OPTIONS as readonly number[]).includes(parsed) ? parsed : 10;
  });

  const [annualReturn, setAnnualReturn] = useState<number>(() => {
    if (typeof window === "undefined") return 8;
    const stored = localStorage.getItem("arkhos_sim_indexa_rate");
    return stored !== null ? Number(stored) : 8;
  });

  const [monthlyContrib, setMonthlyContrib] = useState<number>(() => {
    if (typeof window === "undefined") return defaultMonthlyContrib;
    const stored = localStorage.getItem("arkhos_sim_indexa_monthly");
    return stored !== null ? Number(stored) : defaultMonthlyContrib;
  });

  useEffect(() => { localStorage.setItem("arkhos_sim_indexa_years", String(years)); }, [years]);
  useEffect(() => { localStorage.setItem("arkhos_sim_indexa_rate", String(annualReturn)); }, [annualReturn]);
  useEffect(() => { localStorage.setItem("arkhos_sim_indexa_monthly", String(monthlyContrib)); }, [monthlyContrib]);

  const projection = getProjection(years, annualReturn, monthlyContrib);
  const lastPoint = projection[projection.length - 1];

  // For the bar chart, show all yearly data points
  const chartData = projection.map((p) => ({
    label: p.label,
    total_contributed: p.total_contributed,
    interest_earned: Math.max(0, p.interest_earned),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-4 space-y-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Simulador de proyección
      </p>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Years */}
        <div>
          <label
            className="text-xs uppercase tracking-wide mb-1.5 block"
            style={{ color: "var(--text-muted)" }}
          >
            Años a proyectar
          </label>
          <div className="flex gap-1.5">
            {YEAR_OPTIONS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                className="flex-1 py-1.5 rounded text-xs font-semibold transition-colors duration-150"
                style={{
                  backgroundColor:
                    years === y
                      ? "var(--platform-indexa, #3B78B0)"
                      : "var(--border-stone, rgba(160,120,80,0.15))",
                  color: years === y ? "#fff" : "var(--text-secondary)",
                }}
                aria-pressed={years === y}
              >
                {y}a
              </button>
            ))}
          </div>
        </div>

        {/* Annual return */}
        <div>
          <label
            htmlFor="annual-return"
            className="text-xs uppercase tracking-wide mb-1.5 block"
            style={{ color: "var(--text-muted)" }}
          >
            Rentabilidad anual esperada
          </label>
          <div className="flex items-center gap-2">
            <input
              id="annual-return"
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={annualReturn}
              onChange={(e) => setAnnualReturn(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg px-3 py-1.5 text-sm font-mono text-right border outline-none focus:ring-1 transition-colors"
              style={{
                backgroundColor: "var(--bg-page)",
                borderColor: "var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
              aria-label="Rentabilidad anual esperada en porcentaje"
            />
            <span className="text-sm font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              %
            </span>
          </div>
        </div>

        {/* Monthly contribution */}
        <div>
          <label
            htmlFor="monthly-contrib"
            className="text-xs uppercase tracking-wide mb-1.5 block"
            style={{ color: "var(--text-muted)" }}
          >
            Aportación mensual
          </label>
          <div className="flex items-center gap-2">
            <input
              id="monthly-contrib"
              type="number"
              min={0}
              step={1}
              value={monthlyContrib}
              onChange={(e) => setMonthlyContrib(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg px-3 py-1.5 text-sm font-mono text-right border outline-none focus:ring-1 transition-colors"
              style={{
                backgroundColor: "var(--bg-page)",
                borderColor: "var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
              aria-label="Aportación mensual en euros"
            />
            <span className="text-sm font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              €
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,120,80,0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            tickLine={false}
            axisLine={false}
            style={{ fill: "var(--text-muted)" }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            tickLine={false}
            axisLine={false}
            style={{ fill: "var(--text-muted)" }}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="square"
            iconSize={10}
            formatter={(value) =>
              value === "total_contributed" ? "Aportado" : "Intereses"
            }
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="total_contributed" stackId="a" fill="rgba(59,120,176,0.4)" name="total_contributed" radius={[0, 0, 0, 0]} />
          <Bar dataKey="interest_earned" stackId="a" fill="#3B78B0" name="interest_earned" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      {lastPoint && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-mono"
          style={{
            backgroundColor: "rgba(59,120,176,0.08)",
            border: "1px solid rgba(59,120,176,0.2)",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>En </span>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {years} {years === 1 ? "año" : "años"}
          </span>
          <span style={{ color: "var(--text-muted)" }}> → estimado </span>
          <span className="font-semibold" style={{ color: "#3B78B0" }}>
            {formatEur(lastPoint.projected_value)}
          </span>
          <span style={{ color: "var(--text-muted)" }}> con </span>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatEur(monthlyContrib)}/mes
          </span>
          <span style={{ color: "var(--text-muted)" }}> al </span>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {annualReturn}%
          </span>
        </div>
      )}
    </motion.div>
  );
}
