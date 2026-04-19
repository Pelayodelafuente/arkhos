"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui";
import type { HorosOverview } from "@/types/horos";

const HOROS_COLOR = "#7260C4";
const GRANATE = "#8B1A2E";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const fmtNav = (v: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);

const fmtPct = (v: number, signed = true) =>
  `${signed && v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

interface KPICardProps {
  label: string;
  value: React.ReactNode;
  accent?: string;
}

function KPICard({ label, value, accent }: KPICardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <div
        className="font-mono text-xl font-semibold tabular-nums leading-tight"
        style={{ color: accent ?? "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

interface HorosKPIsProps {
  overview: HorosOverview | null;
  isLoading: boolean;
}

export function HorosKPIs({ overview, isLoading }: HorosKPIsProps) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const gainColor = overview.unrealized_gain >= 0 ? "var(--platform-tr, #2E7D6B)" : GRANATE;

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <KPICard label="Valor actual" value={fmt(overview.total_value)} accent={HOROS_COLOR} />
      <KPICard label="Total invertido" value={fmt(overview.total_cost)} />
      <KPICard
        label="Ganancia latente"
        value={
          <span>
            {overview.unrealized_gain >= 0 ? "+" : ""}
            {fmt(overview.unrealized_gain)}{" "}
            <span className="text-sm opacity-75">({fmtPct(overview.unrealized_gain_pct)})</span>
          </span>
        }
        accent={gainColor}
      />
      <KPICard
        label="VL actual"
        value={`${fmtNav(overview.nav_price)}€`}
        accent={HOROS_COLOR}
      />
    </motion.div>
  );
}
