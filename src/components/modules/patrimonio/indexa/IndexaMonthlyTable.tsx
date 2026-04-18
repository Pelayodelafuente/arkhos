"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui";
import type { IndexaMonthlyTableRow } from "@/types/indexa";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function getCellStyle(value: number | null): React.CSSProperties {
  if (value === null) return {};

  if (value >= 0) {
    const intensity = value > 3 ? 0.35 : value > 1 ? 0.2 : 0.1;
    return { backgroundColor: `rgba(46,125,107,${intensity})`, color: "#1a5c4e" };
  } else {
    const intensity = Math.abs(value) > 1 ? 0.3 : 0.12;
    return { backgroundColor: `rgba(163,45,45,${intensity})`, color: "#7a1515" };
  }
}

function formatPct(v: number | null): string {
  if (v === null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

interface IndexaMonthlyTableProps {
  rows: IndexaMonthlyTableRow[];
  isLoading: boolean;
}

export function IndexaMonthlyTable({ rows, isLoading }: IndexaMonthlyTableProps) {
  if (isLoading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  if (rows.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center text-sm"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          color: "var(--text-muted)",
        }}
      >
        Sin datos de rentabilidad mensual
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Rentabilidades mensuales
        </p>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            backgroundColor: "var(--platform-indexa, #3B78B0)20",
            color: "var(--platform-indexa, #3B78B0)",
          }}
        >
          En %
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <table className="w-full text-xs font-mono min-w-[600px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.25))" }}>
              <th
                className="pl-4 pr-2 py-2 text-left font-semibold w-12"
                style={{ color: "var(--text-secondary)" }}
              >
                Año
              </th>
              {MONTH_LABELS.map((m) => (
                <th
                  key={m}
                  className="px-1 py-2 text-center font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {m}
                </th>
              ))}
              <th
                className="pl-2 pr-4 py-2 text-center font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={row.year}
                style={{
                  borderBottom:
                    rowIdx < rows.length - 1
                      ? "1px solid var(--border-stone, rgba(160,120,80,0.15))"
                      : undefined,
                }}
              >
                <td
                  className="pl-4 pr-2 py-2 font-semibold text-left"
                  style={{ color: "var(--text-primary)" }}
                >
                  {row.year}
                </td>
                {row.months.map((val, mIdx) => {
                  const cellStyle = getCellStyle(val);
                  return (
                    <td
                      key={mIdx}
                      className="px-1 py-2 text-center tabular-nums rounded-sm"
                      style={{
                        color: val === null ? "var(--text-muted)" : cellStyle.color,
                        backgroundColor: cellStyle.backgroundColor,
                      }}
                    >
                      {val === null ? "—" : `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`}
                    </td>
                  );
                })}
                <td
                  className="pl-2 pr-4 py-2 text-center tabular-nums font-semibold"
                  style={row.total !== null ? getCellStyle(row.total) : { color: "var(--text-muted)" }}
                >
                  {formatPct(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
