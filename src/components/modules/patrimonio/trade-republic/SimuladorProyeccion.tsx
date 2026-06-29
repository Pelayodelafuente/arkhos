"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { C } from "@/lib/patrimonio/chart-colors";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectionPoint {
  year: number;
  pesimista: number;
  base: number;
  optimista: number;
}

// ─── Finance helpers ─────────────────────────────────────────────────────────

/**
 * Future value with regular monthly contributions (compound interest).
 * V(n) = V0 × (1 + r/12)^(n×12) + C × [(1 + r/12)^(n×12) − 1] / (r/12)
 */
function futureValue(initial: number, monthly: number, annualRate: number, years: number): number {
  if (years === 0) return initial;
  const r = Math.max(annualRate, 0.001); // floor at 0.1% to avoid /0
  const monthlyRate = r / 12;
  const periods = years * 12;
  const growth = Math.pow(1 + monthlyRate, periods);
  return initial * growth + monthly * ((growth - 1) / monthlyRate);
}

import { formatEur } from "@/lib/utils/format";

const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
};

// ─── Tooltip ────────────────────────────────────────────────────────────────

interface TooltipPayload {
  payload: ProjectionPoint;
  color: string;
  name: string;
  value: number;
}

interface SimTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: number;
}

function SimTooltip({ active, payload, label }: SimTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div
      className="rounded-xl border border-border px-3 py-2.5 text-xs"
      style={{ backgroundColor: "var(--bg-card)", boxShadow: "var(--shadow-modal)" }}
    >
      <p className="mb-2 font-medium text-text-secondary">Año {label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span style={{ color: C.green }}>Optimista</span>
          <span className="font-mono font-medium text-foreground">{formatEur(point.optimista, 0)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span style={{ color: C.blue }}>Base</span>
          <span className="font-mono font-medium text-foreground">{formatEur(point.base, 0)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span style={{ color: C.amber }}>Pesimista</span>
          <span className="font-mono font-medium text-foreground">{formatEur(point.pesimista, 0)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Number input ────────────────────────────────────────────────────────────

interface NumInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

function NumInput({ label, value, onChange, min = 0, max, step = 1, suffix }: NumInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-sand px-3 py-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(v);
          }}
          className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
        />
        {suffix && <span className="shrink-0 text-xs text-text-tertiary">{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Simulator ───────────────────────────────────────────────────────────────

const YEAR_OPTIONS = [5, 10, 15, 20, 30];
const SPREAD = 0.03; // ±3% around base rate for scenarios

export function SimuladorProyeccion() {
  const getCAGR = usePatrimonioStore((s) => s.getCAGR);
  const getTotalMonthlyPlan = usePatrimonioStore((s) => s.getTotalMonthlyPlan);
  const getTRCurrentValue = usePatrimonioStore((s) => s.getTRCurrentValue);

  const storeCagr = getCAGR();
  const storeMonthly = getTotalMonthlyPlan();
  const storeValue = getTRCurrentValue();

  const defaultRate = storeCagr !== null ? Math.min(Math.max(Math.round(storeCagr * 100 * 10) / 10, 1), 30) : 7;

  const [initialCapital, setInitialCapital] = useState<number>(() => {
    if (typeof window === "undefined") return Math.round(storeValue);
    const stored = localStorage.getItem("arkhos_sim_capital");
    return stored !== null ? Number(stored) : Math.round(storeValue);
  });

  const [monthlyContrib, setMonthlyContrib] = useState<number>(() => {
    if (typeof window === "undefined") return Math.round(storeMonthly) || 500;
    const stored = localStorage.getItem("arkhos_sim_monthly");
    return stored !== null ? Number(stored) : Math.round(storeMonthly) || 500;
  });

  const [annualRatePct, setAnnualRatePct] = useState<number>(() => {
    if (typeof window === "undefined") return defaultRate;
    const stored = localStorage.getItem("arkhos_sim_rate");
    return stored !== null ? Number(stored) : defaultRate;
  });

  const [horizon, setHorizon] = useState<number>(() => {
    if (typeof window === "undefined") return 20;
    const stored = localStorage.getItem("arkhos_sim_horizon");
    const parsed = Number(stored);
    return stored !== null && YEAR_OPTIONS.includes(parsed) ? parsed : 20;
  });

  useEffect(() => { localStorage.setItem("arkhos_sim_capital", String(initialCapital)); }, [initialCapital]);
  useEffect(() => { localStorage.setItem("arkhos_sim_monthly", String(monthlyContrib)); }, [monthlyContrib]);
  useEffect(() => { localStorage.setItem("arkhos_sim_rate", String(annualRatePct)); }, [annualRatePct]);
  useEffect(() => { localStorage.setItem("arkhos_sim_horizon", String(horizon)); }, [horizon]);

  const baseRate = annualRatePct / 100;
  const pesRate = Math.max(baseRate - SPREAD, 0.01);
  const optRate = baseRate + SPREAD;

  const data: ProjectionPoint[] = useMemo(
    () =>
      Array.from({ length: horizon + 1 }, (_, year) => ({
        year,
        pesimista: Math.round(futureValue(initialCapital, monthlyContrib, pesRate, year)),
        base: Math.round(futureValue(initialCapital, monthlyContrib, baseRate, year)),
        optimista: Math.round(futureValue(initialCapital, monthlyContrib, optRate, year)),
      })),
    [initialCapital, monthlyContrib, baseRate, pesRate, optRate, horizon]
  );

  const finalPoint = data[data.length - 1];
  const totalContributed = initialCapital + monthlyContrib * horizon * 12;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">Simulador de proyección</h3>
        <p className="text-xs text-text-tertiary">
          Interés compuesto con aportaciones mensuales · escenarios pesimista / base / optimista (±3%)
        </p>
      </div>

      {/* Inputs */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NumInput
          label="Capital inicial"
          value={initialCapital}
          onChange={setInitialCapital}
          min={0}
          step={1000}
          suffix="€"
        />
        <NumInput
          label="Aportación mensual"
          value={monthlyContrib}
          onChange={setMonthlyContrib}
          min={0}
          step={50}
          suffix="€/mes"
        />
        {/* Rate slider with presets */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Rentabilidad base</label>
            <span className="font-mono text-sm font-semibold text-foreground">{annualRatePct}%/año</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            step={0.5}
            value={annualRatePct}
            onChange={(e) => setAnnualRatePct(parseFloat(e.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: "var(--module-patrimonio)" }}
            aria-label="Rentabilidad anual base"
          />
          <div className="flex flex-wrap gap-1">
            {[5, 7, 8.5, 10, 15].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAnnualRatePct(v)}
                className="rounded px-2 py-0.5 font-mono text-xs transition-colors"
                style={{
                  backgroundColor: annualRatePct === v ? "var(--module-patrimonio)" : "var(--bg-sand)",
                  color: annualRatePct === v ? "#fff" : "var(--text-tertiary)",
                  border: `1px solid ${annualRatePct === v ? "var(--module-patrimonio)" : "var(--border)"}`,
                }}
                aria-pressed={annualRatePct === v}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-text-secondary">Horizonte</p>
          <div className="flex flex-wrap gap-1.5">
            {YEAR_OPTIONS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setHorizon(y)}
                className="rounded-md px-2.5 py-1.5 font-mono text-xs font-medium transition-colors"
                style={{
                  backgroundColor: horizon === y ? "var(--module-patrimonio)" : "var(--bg-sand)",
                  color: horizon === y ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${horizon === y ? "var(--module-patrimonio)" : "var(--border)"}`,
                }}
                aria-pressed={horizon === y}
              >
                {y}a
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rate labels */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: C.green }} />
          Optimista ({(optRate * 100).toFixed(1)}%/año)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: C.blue }} />
          Base ({annualRatePct}%/año)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full" style={{ backgroundColor: C.amber }} />
          Pesimista ({(pesRate * 100).toFixed(1)}%/año)
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="gradCone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.blue} stopOpacity={0.12} />
              <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="year"
            tickFormatter={(v: number) => `${v}a`}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={46}
          />
          <Tooltip content={<SimTooltip />} />
          {/* Filled cone between pessimistic and optimistic */}
          <Area
            type="monotone"
            dataKey="optimista"
            stroke={C.green}
            strokeWidth={1.5}
            fill={`url(#gradCone)`}
            dot={false}
            activeDot={{ r: 4, fill: C.green }}
          />
          <Line
            type="monotone"
            dataKey="base"
            stroke={C.blue}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: C.blue }}
          />
          <Line
            type="monotone"
            dataKey="pesimista"
            stroke={C.amber}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 4, fill: C.amber }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary table */}
      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Proyección a {horizon} años
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-border bg-sand px-3 py-2.5 text-center">
            <p className="text-xs text-text-tertiary">Aportado total</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
              {formatEur(totalContributed, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-sand px-3 py-2.5 text-center">
            <p className="text-xs" style={{ color: C.amber }}>Pesimista</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
              {formatEur(finalPoint.pesimista, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-sand px-3 py-2.5 text-center">
            <p className="text-xs" style={{ color: C.blue }}>Base</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
              {formatEur(finalPoint.base, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-sand px-3 py-2.5 text-center">
            <p className="text-xs" style={{ color: C.green }}>Optimista</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
              {formatEur(finalPoint.optimista, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-sand px-3 py-2.5 text-center">
            <p className="text-xs text-text-tertiary">x ganado (base)</p>
            <p className="mt-0.5 font-mono text-sm font-semibold" style={{ color: C.green }}>
              {totalContributed > 0 ? `×${(finalPoint.base / totalContributed).toFixed(1)}` : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
