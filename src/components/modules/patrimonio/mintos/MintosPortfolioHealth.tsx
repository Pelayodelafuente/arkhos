"use client";

import type { MintosHealthSegment } from "@/types/mintos";
import { formatCurrency } from "@/lib/utils/format";

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

interface MintosPortfolioHealthProps {
  segments: MintosHealthSegment[];
  snapshotDate?: string | null;
}

export function MintosPortfolioHealth({ segments, snapshotDate }: MintosPortfolioHealthProps) {
  if (segments.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sin datos de salud de cartera. Actualiza desde Mintos.
        </p>
      </div>
    );
  }

  const totalAmount = segments.reduce((s, seg) => s + seg.amount, 0);
  const moraSegments = segments.filter((s) => s.level === "warn" || s.level === "orange" || s.level === "red");
  const moraAmount = moraSegments
    .filter((s) => s.label !== "Período de gracia")
    .reduce((s, seg) => s + seg.amount, 0);
  const moraPct = totalAmount > 0 ? (moraAmount / totalAmount) * 100 : 0;

  const formattedDate = snapshotDate
    ? new Date(snapshotDate).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          Salud de la Cartera
        </h3>
        {formattedDate && (
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {formattedDate}
          </span>
        )}
      </div>

      {/* Stacked progress bar */}
      <div className="h-4 rounded-full overflow-hidden flex w-full" aria-label="Distribución de salud de la cartera">
        {segments.map((seg) => (
          <div
            key={seg.label}
            title={`${seg.label}: ${seg.pct}%`}
            style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
            aria-label={`${seg.label}: ${seg.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Segment list */}
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-3">
            {/* Color chip */}
            <div
              className="h-3 w-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: seg.color }}
              aria-hidden="true"
            />
            {/* Label */}
            <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {seg.label}
            </span>
            {/* Amount */}
            <span className="font-mono text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
              {fmt(seg.amount)}
            </span>
            {/* Count */}
            <span className="text-xs w-16 text-right" style={{ color: "var(--text-muted)" }}>
              {seg.count} préstamos
            </span>
            {/* Pct */}
            <span
              className="font-mono text-xs tabular-nums w-12 text-right"
              style={{ color: "var(--text-muted)" }}
            >
              {seg.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Footer summary */}
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
        style={{
          backgroundColor: moraPct > 5
            ? "color-mix(in srgb, #A32D2D 8%, transparent)"
            : "color-mix(in srgb, var(--platform-mintos) 6%, transparent)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.2))",
        }}
      >
        <span style={{ color: "var(--text-secondary)" }}>En mora total</span>
        <span className="font-mono font-medium tabular-nums" style={{ color: moraPct > 5 ? "#A32D2D" : "var(--text-primary)" }}>
          {moraPct.toFixed(2)}% — {fmt(moraAmount)}
        </span>
      </div>
    </div>
  );
}
