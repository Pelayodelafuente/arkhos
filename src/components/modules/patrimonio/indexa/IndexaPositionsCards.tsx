"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui";
import type { IndexaPosition } from "@/types/indexa";

import { formatEur } from "@/lib/utils/format";

const formatNum = (v: number | null, dec = 4) =>
  v === null ? "—" : new Intl.NumberFormat("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);

const FUND_TYPE_LABEL: Record<string, string> = {
  equity: "ACCIONES",
  bond: "BONOS",
  cash: "LIQUIDEZ",
};

// Using inline style hex only for the fund accent bars (literal brand colors)
const FUND_TYPE_COLOR: Record<string, string> = {
  equity: "#3B78B0",
  bond: "#7260C4",
  cash: "#888780",
};

interface PositionCardProps {
  position: IndexaPosition;
  index: number;
}

function PositionCard({ position, index }: PositionCardProps) {
  const fundType = position.fund_type ?? "equity";
  const color = FUND_TYPE_COLOR[fundType] ?? "#888780";
  const label = FUND_TYPE_LABEL[fundType] ?? fundType.toUpperCase();
  const name = position.fund?.name ?? "Fondo";
  const isin = position.fund?.isin ?? null;
  const benchmark = position.fund?.benchmark ?? null;
  const gain = position.unrealized_gain;
  const alloc = position.allocation_pct ?? 0;
  const gainPct =
    position.total_cost > 0 ? (gain / position.total_cost) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      <div className="pl-4 pr-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p
              className="text-sm font-semibold leading-tight truncate mb-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {name}
            </p>
            {isin && (
              <p className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                {isin}
              </p>
            )}
          </div>
          <span
            className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-semibold tracking-wide"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {label}
          </span>
        </div>

        {/* Value row */}
        <div className="mb-3">
          <p className="font-mono text-2xl font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {formatEur(position.total_value)}
          </p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 text-xs">
          <div>
            <span style={{ color: "var(--text-muted)" }}>Participaciones</span>
            <p className="font-mono font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {formatNum(position.shares)}
            </p>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Precio/participación</span>
            <p className="font-mono font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {formatNum(position.price_per_share, 2)}
            </p>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Coste</span>
            <p className="font-mono font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {formatEur(position.total_cost)}
            </p>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Ganancia latente</span>
            <p
              className="font-mono font-medium tabular-nums"
              style={{ color: gain >= 0 ? "var(--platform-tr, #2E7D6B)" : "#A32D2D" }}
            >
              {gain >= 0 ? "+" : ""}
              {formatEur(gain)}{" "}
              <span className="text-xs opacity-80">
                ({gain >= 0 ? "+" : ""}
                {gainPct.toFixed(2)}%)
              </span>
            </p>
          </div>
        </div>

        {/* Allocation bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "var(--text-muted)" }}>Peso en cartera</span>
            <span className="font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
              {alloc.toFixed(1)}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--border-stone, rgba(160,120,80,0.25))" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(alloc, 100)}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Benchmark footer */}
        {benchmark && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Benchmark: {benchmark}
          </p>
        )}
      </div>
    </motion.div>
  );
}

interface IndexaPositionsCardsProps {
  positions: IndexaPosition[];
  isLoading: boolean;
}

export function IndexaPositionsCards({ positions, isLoading }: IndexaPositionsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center text-sm"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          color: "var(--text-muted)",
        }}
      >
        Sin posiciones registradas
      </div>
    );
  }

  const mainPositions = positions.filter((p) => p.fund_type !== "cash");
  const cashPositions = positions.filter((p) => p.fund_type === "cash");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mainPositions.map((pos, i) => (
          <PositionCard key={pos.id} position={pos} index={i} />
        ))}
      </div>

      {cashPositions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cashPositions.map((pos) => (
            <div
              key={pos.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
              }}
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: FUND_TYPE_COLOR.cash }}
                aria-hidden="true"
              />
              <span style={{ color: "var(--text-secondary)" }}>{pos.fund?.name ?? "Liquidez"}</span>
              <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatEur(pos.total_value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
