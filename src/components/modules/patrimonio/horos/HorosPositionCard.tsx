"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import type { HorosOverview } from "@/types/horos";

const HOROS_COLOR = "#7260C4";
const GRANATE = "#8B1A2E";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const fmtPct = (v: number, signed = true) =>
  `${signed && v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

interface HorosPositionCardProps {
  overview: HorosOverview;
  onUpdateNav: () => void;
}

export function HorosPositionCard({ overview, onUpdateNav }: HorosPositionCardProps) {
  const gainColor = overview.unrealized_gain >= 0 ? "var(--platform-tr, #2E7D6B)" : GRANATE;
  const navGainColor = overview.nav_gain_per_share >= 0 ? "var(--platform-tr, #2E7D6B)" : GRANATE;
  const navDate = new Date(overview.nav_date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        borderTop: `2px solid ${HOROS_COLOR}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Posición
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{overview.fund_name}</p>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            ISIN: {overview.isin}
          </p>
        </div>
        <button
          type="button"
          onClick={onUpdateNav}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
          style={{
            backgroundColor: `color-mix(in srgb, ${HOROS_COLOR} 12%, transparent)`,
            color: HOROS_COLOR,
          }}
        >
          <RefreshCw size={12} strokeWidth={1.75} />
          Actualizar VL
        </button>
      </div>

      {/* VL badge */}
      <div
        className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
        style={{
          backgroundColor: `color-mix(in srgb, ${HOROS_COLOR} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${HOROS_COLOR} 20%, transparent)`,
        }}
      >
        <span className="font-mono text-sm font-semibold" style={{ color: HOROS_COLOR }}>
          VL {overview.nav_price.toFixed(3)}€
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {navDate}</span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricRow label="Participaciones" value={overview.shares.toFixed(6)} mono />
        <MetricRow label="VL medio de compra" value={`${overview.avg_nav.toFixed(3)}€`} mono />
        <MetricRow
          label="Diferencia VL"
          value={`${overview.nav_gain_per_share >= 0 ? "+" : ""}${overview.nav_gain_per_share.toFixed(3)}€`}
          color={navGainColor}
          mono
        />
        <MetricRow
          label="Rentabilidad"
          value={fmtPct(overview.unrealized_gain_pct)}
          color={gainColor}
          mono
        />
        <MetricRow label="Total invertido" value={fmt(overview.total_cost)} mono />
        <MetricRow
          label="Ganancia latente"
          value={`${overview.unrealized_gain >= 0 ? "+" : ""}${fmt(overview.unrealized_gain)}`}
          color={gainColor}
          mono
        />
      </div>

      {/* Philosophy blurb */}
      <div
        className="mt-4 rounded-lg p-3 text-xs leading-relaxed"
        style={{
          backgroundColor: `color-mix(in srgb, ${GRANATE} 5%, transparent)`,
          borderLeft: `3px solid ${GRANATE}`,
          color: "var(--text-secondary)",
        }}
      >
        <em>&ldquo;Buscamos empresas infravaloradas por el mercado con potencial de revalorización a largo plazo.&rdquo;</em>
        <span className="block mt-1 font-medium" style={{ color: GRANATE }}>
          Gestión activa · Value investing · Largo plazo
        </span>
      </div>
    </motion.div>
  );
}

function MetricRow({
  label,
  value,
  color,
  mono,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: "var(--bg-page)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.15))",
      }}
    >
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${mono ? "font-mono" : ""}`}
        style={{ color: color ?? "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}
