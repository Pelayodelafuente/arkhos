"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus } from "lucide-react";
import type { HorosMonthlyPlan, HorosTransaction, HorosProjectionPoint } from "@/types/horos";
import { RegisterHorosContributionModal } from "./RegisterHorosContributionModal";

const HOROS_COLOR = "#7260C4";
const GRANATE = "#8B1A2E";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

function getNextContributionDate(plan: HorosMonthlyPlan): string {
  const today = new Date();
  const next = new Date(today.getFullYear(), today.getMonth() + 1, plan.execution_day);
  if (next.getDay() === 0) next.setDate(next.getDate() + 1);
  if (next.getDay() === 6) next.setDate(next.getDate() + 2);
  return next.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

function ProjectionTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        minWidth: 160,
      }}
    >
      <p className="font-medium mb-1.5 text-foreground">{label}</p>
      <div className="space-y-1 font-mono">
        {payload.map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: "var(--text-muted)" }}>
              {p.name === "projected_value" ? "Valor proyectado" : "Aportado"}
            </span>
            <span style={{ color: p.color }}>{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HorosPlanPanelProps {
  plan: HorosMonthlyPlan | null;
  transactions: HorosTransaction[];
  getProjection: (years: number, annualReturn: number, monthlyContrib: number) => HorosProjectionPoint[];
}

export function HorosPlanPanel({ plan, transactions, getProjection }: HorosPlanPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [projYears, setProjYears] = useState(5);
  const [projReturn, setProjReturn] = useState(6);
  const [projContrib, setProjContrib] = useState(plan?.monthly_amount ?? 100);

  const projectionData = getProjection(projYears, projReturn, projContrib);
  const totalInvested = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Active plan summary */}
      {plan && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
            borderTop: `2px solid ${HOROS_COLOR}`,
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-heading text-sm text-foreground">Plan activo</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Horos Value Internacional, FI
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: `color-mix(in srgb, ${HOROS_COLOR} 12%, transparent)`,
                color: HOROS_COLOR,
              }}
            >
              <Plus size={12} />
              Registrar
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Aportación" value={fmt(plan.monthly_amount)} />
            <StatCard label="Día de ejecución" value={`Día ${plan.execution_day}`} />
            <StatCard
              label="Desde"
              value={plan.started_at ? fmtDate(plan.started_at) : "—"}
            />
            <StatCard label="Total aportado" value={fmt(totalInvested)} accent={HOROS_COLOR} />
          </div>

          <div
            className="mt-3 rounded-lg px-4 py-2.5 text-xs font-mono"
            style={{
              backgroundColor: `color-mix(in srgb, ${HOROS_COLOR} 8%, transparent)`,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Próxima aportación estimada: </span>
            <strong style={{ color: HOROS_COLOR }}>{getNextContributionDate(plan)}</strong>
          </div>
        </motion.div>
      )}

      {/* Contribution timeline */}
      {transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.06 }}
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          }}
        >
          <h3 className="font-heading text-sm text-foreground mb-4">Historial de aportaciones</h3>
          <div className="space-y-2">
            {[...transactions].reverse().map((tx, i) => {
              const cumPart = transactions
                .slice(0, transactions.length - i)
                .reduce((s, t) => s + t.shares, 0);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 text-xs py-1.5"
                  style={{
                    borderBottom: i < transactions.length - 1 ? "1px solid var(--border-stone, rgba(160,120,80,0.1))" : "none",
                  }}
                >
                  <span className="font-mono" style={{ color: "var(--text-muted)" }}>
                    {fmtDate(tx.value_date)}
                  </span>
                  <span style={{ color: HOROS_COLOR }} className="font-mono">
                    VL {tx.nav_applied.toFixed(3)}€
                  </span>
                  <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                    {fmt(tx.amount)}
                  </span>
                  <span className="font-mono text-right min-w-[80px]" style={{ color: "var(--text-muted)" }}>
                    {cumPart.toFixed(4)} part.
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Projection simulator */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.12 }}
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <h3 className="font-heading text-sm text-foreground mb-1">Simulador de proyección</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Horos es value investing — la rentabilidad puede ser irregular año a año
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Años
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={projYears}
              onChange={(e) => setProjYears(parseInt(e.target.value) || 5)}
              className="w-full rounded-lg px-3 py-2 font-mono text-sm text-center"
              style={{
                backgroundColor: "var(--bg-page)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Rentabilidad anual %
            </label>
            <input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={projReturn}
              onChange={(e) => setProjReturn(parseFloat(e.target.value) || 6)}
              className="w-full rounded-lg px-3 py-2 font-mono text-sm text-center"
              style={{
                backgroundColor: "var(--bg-page)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Aportación €/mes
            </label>
            <input
              type="number"
              min={0}
              value={projContrib}
              onChange={(e) => setProjContrib(parseFloat(e.target.value) || 100)}
              className="w-full rounded-lg px-3 py-2 font-mono text-sm text-center"
              style={{
                backgroundColor: "var(--bg-page)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {projectionData.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={projectionData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={HOROS_COLOR} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={HOROS_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone, rgba(160,120,80,0.15))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--text-muted, #888780)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k€`}
                  width={42}
                />
                <Tooltip content={<ProjectionTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total_contributed"
                  stroke={GRANATE}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                  dot={false}
                  name="total_contributed"
                />
                <Area
                  type="monotone"
                  dataKey="projected_value"
                  stroke={HOROS_COLOR}
                  strokeWidth={2}
                  fill="url(#projGrad)"
                  dot={false}
                  name="projected_value"
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Final year summary */}
            {projectionData[projectionData.length - 1] && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="rounded-lg p-2" style={{ backgroundColor: "var(--bg-page)" }}>
                  <div style={{ color: "var(--text-muted)" }}>Valor en Año {projYears}</div>
                  <div className="font-semibold" style={{ color: HOROS_COLOR }}>
                    {fmt(projectionData[projectionData.length - 1].projected_value)}
                  </div>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: "var(--bg-page)" }}>
                  <div style={{ color: "var(--text-muted)" }}>Total aportado</div>
                  <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {fmt(projectionData[projectionData.length - 1].total_contributed)}
                  </div>
                </div>
                <div className="rounded-lg p-2" style={{ backgroundColor: "var(--bg-page)" }}>
                  <div style={{ color: "var(--text-muted)" }}>Intereses</div>
                  <div className="font-semibold" style={{ color: "var(--platform-tr, #2E7D6B)" }}>
                    {fmt(projectionData[projectionData.length - 1].interest_earned)}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {showModal && (
        <RegisterHorosContributionModal
          defaultAmount={plan?.monthly_amount ?? 100}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: "var(--bg-page)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.15))",
      }}
    >
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold" style={{ color: accent ?? "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
