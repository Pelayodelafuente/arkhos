"use client";

import { motion } from "framer-motion";
import type { HorosAnnualCosts } from "@/types/horos";

const HOROS_COLOR = "var(--module-mercados)";
const GRANATE = "#8B1A2E";

const fmt = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

interface HorosCostPanelProps {
  costs: HorosAnnualCosts[];
  currentValue: number;
}

export function HorosCostPanel({ costs, currentValue }: HorosCostPanelProps) {
  const latest = costs[0];
  if (!latest) return null;

  const horosPct = latest.total_pct ?? 0.84;
  const indexaPct = 0.11;
  const maxPct = Math.max(horosPct, indexaPct, 1);
  const years = 10;
  const withHoros = currentValue * Math.pow(1 + 0.06 - horosPct / 100, years);
  const withIndexa = currentValue * Math.pow(1 + 0.06 - indexaPct / 100, years);
  const costDiff = withIndexa - withHoros;

  return (
    <div className="space-y-4">
      {/* Cost breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <h3 className="font-heading text-sm text-foreground mb-4">
          Costes del fondo ({latest.year})
        </h3>

        <div className="space-y-2.5">
          <CostRow label="Comisión de gestión" value={fmt(latest.management_fee)} pct="0,72%" />
          <CostRow label="Comisión depositaría" value={fmt(latest.custody_fee)} pct="0,03%" />
          <CostRow label="Otros recurrentes" value={fmt(latest.other_fees)} pct="0,09%" />
          <CostRow label="Costes operaciones" value={fmt(latest.operation_costs)} pct="—" />
          <div
            className="pt-2.5 border-t"
            style={{ borderColor: "var(--border-stone, rgba(160,120,80,0.2))" }}
          >
            <CostRow
              label="TOTAL"
              value={fmt(latest.total_costs)}
              pct={`${latest.total_pct?.toFixed(2)}%`}
              bold
            />
          </div>
        </div>
      </motion.div>

      {/* Comparative bars */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.08 }}
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <h3 className="font-heading text-sm text-foreground mb-1">Comparativa de costes</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          La diferencia refleja el coste de la gestión activa value
        </p>

        <div className="space-y-3">
          <ComparativeBar label="Horos" pct={horosPct} maxPct={maxPct} color={GRANATE} />
          <ComparativeBar label="Indexa Capital (ref.)" pct={indexaPct} maxPct={maxPct} color={HOROS_COLOR} />
        </div>
      </motion.div>

      {/* Impact projection */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.16 }}
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          borderLeft: `3px solid ${GRANATE}`,
        }}
      >
        <h3 className="font-heading text-sm text-foreground mb-1">Impacto proyectado</h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          A 10 años (asumiendo +6% anual bruto, sin nuevas aportaciones)
        </p>
        <p className="font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
          Diferencia de coste estimada:{" "}
          <strong style={{ color: GRANATE }}>
            {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(costDiff)}
          </strong>
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          El gestor activo de Horos busca superar esta diferencia con su selección de valores. Horos es
          inversión de convicción, no indexación.
        </p>
      </motion.div>
    </div>
  );
}

function CostRow({
  label,
  value,
  pct,
  bold,
}: {
  label: string;
  value: string;
  pct: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${bold ? "font-semibold" : ""}`}>
      <span className="text-xs" style={{ color: bold ? "var(--text-primary)" : "var(--text-secondary)" }}>
        {label}
      </span>
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>{pct}</span>
        <span className="font-mono text-xs text-right min-w-[64px]" style={{ color: "var(--text-primary)" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function ComparativeBar({
  label,
  pct,
  maxPct,
  color,
}: {
  label: string;
  pct: number;
  maxPct: number;
  color: string;
}) {
  const width = `${(pct / maxPct) * 100}%`;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="font-mono text-xs" style={{ color }}>{pct.toFixed(2)}%</span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--bg-page)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
