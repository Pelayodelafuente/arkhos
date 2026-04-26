"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PortfolioSnapshot } from "@/types/patrimonio";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function investmentValue(s: PortfolioSnapshot): number {
  return s.total_value - s.cash_value;
}

interface HeatCell {
  year: number;
  month: number; // 1-indexed
  pct: number | null;
}

function buildCells(snapshots: PortfolioSnapshot[]): { cells: HeatCell[]; years: number[] } {
  if (snapshots.length < 2) return { cells: [], years: [] };

  // Group by YYYY-MM, keep last snapshot per month
  const byMonth = new Map<string, PortfolioSnapshot>();
  for (const s of snapshots) {
    const key = s.snapshot_date.substring(0, 7);
    const existing = byMonth.get(key);
    if (!existing || s.snapshot_date > existing.snapshot_date) {
      byMonth.set(key, s);
    }
  }

  const sortedKeys = Array.from(byMonth.keys()).sort();

  // Compute cashflow-adjusted monthly returns
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
    if (!isFinite(pct) || isNaN(pct)) continue;
    returnByMonth.set(currKey, parseFloat(pct.toFixed(2)));
  }

  // Year range
  const allYears = sortedKeys.map((k) => parseInt(k.substring(0, 4), 10));
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  // Build flat cells
  const cells: HeatCell[] = [];
  for (const y of years) {
    for (let m = 1; m <= 12; m++) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const pct = returnByMonth.has(key) ? returnByMonth.get(key)! : null;
      cells.push({ year: y, month: m, pct });
    }
  }

  return { cells, years };
}

// ---------------------------------------------------------------------------
// Hovered cell state type
// ---------------------------------------------------------------------------

interface HoveredCell {
  year: number;
  month: number;
  pct: number | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReturnHeatmap() {
  const snapshots = usePatrimonioStore((s) => s.snapshots);
  const ref = useRef<SVGSVGElement>(null);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);

  const { cells, years } = useMemo(() => buildCells(snapshots), [snapshots]);

  // D3 color scale: red → neutral → green
  // @ts-ignore — d3.scaleLinear<string> type parameter accepted at runtime
  const colorScale = useMemo(
    () =>
      d3
        .scaleLinear<string>()
        .domain([-3, 0, 3])
        .range(["#A32D2D", "#e8e3dc", "#2E7D6B"]),
    []
  );

  useEffect(() => {
    if (!ref.current || cells.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const CELL_W = 36;
    const CELL_H = 28;
    const MARGIN = { left: 44, top: 32, right: 8, bottom: 8 };
    const width = MARGIN.left + CELL_W * 12 + MARGIN.right;
    const height = MARGIN.top + CELL_H * years.length + MARGIN.bottom;

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Month headers
    svg
      .selectAll(".month-label")
      .data(MONTHS)
      .enter()
      .append("text")
      .attr("x", (_, i) => MARGIN.left + i * CELL_W + CELL_W / 2)
      .attr("y", MARGIN.top - 8)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "var(--text-tertiary)")
      .text((d) => d);

    // Year labels
    svg
      .selectAll(".year-label")
      .data(years)
      .enter()
      .append("text")
      .attr("x", MARGIN.left - 6)
      .attr("y", (_, i) => MARGIN.top + i * CELL_H + CELL_H / 2 + 4)
      .attr("text-anchor", "end")
      .attr("font-size", 10)
      .attr("fill", "var(--text-tertiary)")
      .text((d) => String(d));

    // Build cells with grid positions
    const cellsWithPos = cells.map((c) => ({
      ...c,
      col: c.month - 1,
      row: years.indexOf(c.year),
    }));

    // Rect cells
    svg
      .selectAll(".cell")
      .data(cellsWithPos)
      .enter()
      .append("rect")
      .attr("x", (d) => MARGIN.left + d.col * CELL_W + 1)
      .attr("y", (d) => MARGIN.top + d.row * CELL_H + 1)
      .attr("width", CELL_W - 2)
      .attr("height", CELL_H - 2)
      .attr("rx", 3)
      // @ts-ignore — colorScale accepts number at runtime
      .attr("fill", (d) => (d.pct === null ? "var(--bg-sand)" : colorScale(d.pct)))
      .attr("opacity", (d) => (d.pct === null ? 0.5 : 0.85))
      .style("cursor", "default")
      .on("mouseenter", function (_event, d) {
        setHoveredCell({ year: d.year, month: d.month, pct: d.pct });
      })
      .on("mouseleave", () => setHoveredCell(null));

    // Value text inside cells
    svg
      .selectAll(".cell-text")
      .data(cellsWithPos.filter((c) => c.pct !== null))
      .enter()
      .append("text")
      .attr("x", (d) => MARGIN.left + d.col * CELL_W + CELL_W / 2)
      .attr("y", (d) => MARGIN.top + d.row * CELL_H + CELL_H / 2 + 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("font-family", "var(--font-mono)")
      .attr("fill", (d) =>
        Math.abs(d.pct!) > 1.5 ? "#fff" : "var(--text-secondary)"
      )
      .attr("pointer-events", "none")
      .text((d) => `${d.pct! >= 0 ? "+" : ""}${d.pct!.toFixed(1)}%`);
  }, [cells, years, colorScale]);

  if (cells.length === 0) {
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

  return (
    <div>
      <div className="overflow-x-auto">
        <svg ref={ref} style={{ display: "block", overflow: "visible" }} />
      </div>
      {hoveredCell && hoveredCell.pct !== null && (
        <p
          className="mt-2 text-xs"
          style={{
            fontFamily: "var(--font-mono)",
            color: hoveredCell.pct >= 0 ? "var(--color-gain, #2E7D6B)" : "var(--color-loss, #A32D2D)",
          }}
        >
          {MONTHS[hoveredCell.month - 1]} {hoveredCell.year}:{" "}
          {hoveredCell.pct >= 0 ? "+" : ""}
          {hoveredCell.pct.toFixed(2)}%
        </p>
      )}
      {/* Color legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {[
          { color: "#2E7D6B", label: ">+2%" },
          { color: "#4caf88", label: "+0.5% a +2%" },
          { color: "#e8e3dc", label: "±0.5%", border: "1px solid var(--border)" },
          { color: "#e8a0a0", label: "-0.5% a -2%" },
          { color: "#A32D2D", label: "<-2%" },
        ].map(({ color, label, border }) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: color, border, flexShrink: 0 }}
            />
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
