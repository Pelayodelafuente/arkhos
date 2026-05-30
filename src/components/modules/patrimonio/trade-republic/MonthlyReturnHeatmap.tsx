"use client";

import { useMemo, useState } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PortfolioSnapshot } from "@/types/patrimonio";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7); // "YYYY-MM"
}

function getYear(dateStr: string): number {
  return parseInt(dateStr.substring(0, 4), 10);
}

function getMonth(dateStr: string): number {
  return parseInt(dateStr.substring(5, 7), 10) - 1; // 0-indexed
}

// Returns the portfolio value for a snapshot (total_value is already portfolio-only)
function investmentValue(s: PortfolioSnapshot): number {
  return s.total_value;
}

// ---------------------------------------------------------------------------
// Color scale
// ---------------------------------------------------------------------------

interface ReturnColor {
  bg: string;
  text: string;
  label: string;
}

function getReturnColor(pct: number | null): ReturnColor {
  if (pct === null) {
    return { bg: "var(--bg-sand)", text: "var(--text-tertiary)", label: "Sin datos" };
  }
  if (pct > 2) return { bg: "#1a6b50", text: "#ffffff", label: ">+2%" };
  if (pct > 0.5) return { bg: "#4caf88", text: "#ffffff", label: "+0.5% a +2%" };
  if (pct >= -0.5) return { bg: "#e8e3dc", text: "var(--text-secondary)", label: "±0.5%" };
  if (pct >= -2) return { bg: "#e8a0a0", text: "#7a1a1a", label: "-0.5% a -2%" };
  return { bg: "#c53030", text: "#ffffff", label: "<-2%" };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MonthCell {
  pct: number | null;
  yearMonth: string; // "YYYY-MM"
}

interface YearRow {
  year: number;
  months: MonthCell[]; // length 12, index = month 0-11
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface HoverState {
  yearMonth: string;
  pct: number | null;
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonthlyReturnHeatmap() {
  const snapshots = usePatrimonioStore((s) => s.snapshots);
  const [hover, setHover] = useState<HoverState | null>(null);

  const rows: YearRow[] = useMemo(() => {
    if (snapshots.length < 2) return [];

    // Group snapshots by YYYY-MM, keep the last one of each month
    const byMonth = new Map<string, PortfolioSnapshot>();
    for (const s of snapshots) {
      const key = getMonthKey(s.snapshot_date);
      const existing = byMonth.get(key);
      if (!existing || s.snapshot_date > existing.snapshot_date) {
        byMonth.set(key, s);
      }
    }

    // Sort month keys
    const sortedKeys = Array.from(byMonth.keys()).sort();

    // Build month-to-return map using cashflow-adjusted returns.
    // Raw (unadjusted) returns include the effect of new money injected, making months with
    // large new purchases appear as huge gains (e.g. +50%). The cashflow-adjusted formula
    // (equivalent to one TWR period) removes the capital-injection effect:
    //   adjustedReturn = (endValue - startValue - cashFlow) / startValue
    // where cashFlow = change in total_invested (new money added that month).
    const returnByMonth = new Map<string, number>();
    for (let i = 1; i < sortedKeys.length; i++) {
      const prevKey = sortedKeys[i - 1];
      const currKey = sortedKeys[i];
      const prev = byMonth.get(prevKey);
      const curr = byMonth.get(currKey);
      if (!prev || !curr) continue;
      const prevVal = investmentValue(prev);
      const currVal = investmentValue(curr);
      if (prevVal <= 0) continue;
      const cashFlow = curr.total_invested - prev.total_invested;
      const pct = ((currVal - cashFlow - prevVal) / prevVal) * 100;
      // Skip periods with impossible values (NaN, Infinity, or clearly wrong data)
      if (!isFinite(pct) || isNaN(pct)) continue;
      returnByMonth.set(currKey, pct);
    }

    // Determine year range
    const years = Array.from(byMonth.keys()).map(getYear);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // Build rows
    const result: YearRow[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      const months: MonthCell[] = Array.from({ length: 12 }, (_, m) => {
        const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
        const pct = returnByMonth.has(monthKey) ? returnByMonth.get(monthKey)! : null;
        return { pct, yearMonth: monthKey };
      });
      result.push({ year: y, months });
    }

    return result;
  }, [snapshots]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Sin datos suficientes
        </p>
        <p className="max-w-xs text-xs" style={{ color: "var(--text-tertiary)" }}>
          Se necesitan al menos 2 snapshots de meses distintos para calcular retornos.
        </p>
      </div>
    );
  }

  const LEGEND_ITEMS: { color: ReturnColor; label: string }[] = [
    { color: { bg: "#1a6b50", text: "#ffffff", label: "" }, label: ">+2%" },
    { color: { bg: "#4caf88", text: "#ffffff", label: "" }, label: "+0.5% a +2%" },
    { color: { bg: "#e8e3dc", text: "var(--text-secondary)", label: "" }, label: "±0.5%" },
    { color: { bg: "#e8a0a0", text: "#7a1a1a", label: "" }, label: "-0.5% a -2%" },
    { color: { bg: "#c53030", text: "#ffffff", label: "" }, label: "<-2%" },
  ];

  return (
    <div className="relative overflow-x-auto">
      {/* Month headers */}
      <div className="mb-1 grid items-center" style={{ gridTemplateColumns: "3rem repeat(12, 1fr)" }}>
        <div />
        {MONTH_LABELS.map((m) => (
          <div
            key={m}
            className="text-center text-xs font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            {m}
          </div>
        ))}
      </div>

      {/* Year rows */}
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.year}
            className="grid items-center"
            style={{ gridTemplateColumns: "3rem repeat(12, 1fr)", gap: "3px" }}
          >
            <div
              className="pr-2 text-right font-mono text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {row.year}
            </div>
            {row.months.map((cell, monthIdx) => {
              const color = getReturnColor(cell.pct);
              const isEmpty = cell.pct === null;
              return (
                <div
                  key={cell.yearMonth}
                  className="flex cursor-default items-center justify-center rounded text-xs font-mono font-medium transition-opacity"
                  style={{
                    backgroundColor: color.bg,
                    color: color.text,
                    height: "2rem",
                    opacity: isEmpty ? 0.4 : 1,
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHover({
                      yearMonth: cell.yearMonth,
                      pct: cell.pct,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                  aria-label={
                    isEmpty
                      ? `${MONTH_LABELS[monthIdx]} ${row.year}: sin datos`
                      : `${MONTH_LABELS[monthIdx]} ${row.year}: ${cell.pct!.toFixed(2)}%`
                  }
                >
                  {isEmpty ? "—" : `${cell.pct! >= 0 ? "+" : ""}${cell.pct!.toFixed(1)}%`}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hover && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border px-3 py-2 text-xs shadow-lg"
          style={{
            left: hover.x,
            top: hover.y - 8,
            transform: "translate(-50%, -100%)",
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-modal)",
          }}
        >
          <p className="font-medium" style={{ color: "var(--text-secondary)" }}>
            {(() => {
              const [y, m] = hover.yearMonth.split("-");
              return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`;
            })()}
          </p>
          <p className="font-mono font-semibold mt-0.5" style={{
            color: hover.pct === null
              ? "var(--text-tertiary)"
              : hover.pct >= 0 ? "#2E7D6B" : "#A32D2D"
          }}>
            {hover.pct === null
              ? "Sin datos"
              : `${hover.pct >= 0 ? "+" : ""}${hover.pct.toFixed(2)}%`}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Retorno:</span>
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <span
              className="inline-block h-3 w-5 rounded-sm"
              style={{ backgroundColor: item.color.bg }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
