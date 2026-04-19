"use client";

import { motion } from "framer-motion";
import type { HorosTransactionPerformance } from "@/types/horos";

const HOROS_COLOR = "#7260C4";
const GRANATE = "#8B1A2E";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const fmtNav = (v: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);

const fmtShares = (v: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });

interface HorosTransactionTableProps {
  data: HorosTransactionPerformance[];
}

export function HorosTransactionTable({ data }: HorosTransactionTableProps) {
  if (data.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-stone, rgba(160,120,80,0.2))" }}>
        <h3 className="font-heading text-sm text-foreground">Rentabilidad por compra</h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Valor actual de cada aportación individual
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.2))" }}>
              {["Fecha", "VL pagado", "Participaciones", "Importe", "Valor actual", "Ganancia", "%"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left font-medium"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const gainColor = row.gain >= 0 ? "var(--platform-tr, #2E7D6B)" : GRANATE;
              return (
                <motion.tr
                  key={row.transaction.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.22 }}
                  className="transition-colors hover:bg-stone-50"
                  style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.1))" }}
                >
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {fmtDate(row.transaction.value_date)}
                  </td>
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: HOROS_COLOR }}>
                    {fmtNav(row.transaction.nav_applied)}€
                  </td>
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                    {fmtShares(row.transaction.shares)}
                  </td>
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                    {fmt(row.transaction.amount)}
                  </td>
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap font-semibold" style={{ color: "var(--text-primary)" }}>
                    {fmt(row.current_value)}
                  </td>
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap font-semibold" style={{ color: gainColor }}>
                    {row.gain >= 0 ? "+" : ""}{fmt(row.gain)}
                  </td>
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: gainColor }}>
                    {row.gain_pct >= 0 ? "+" : ""}{row.gain_pct.toFixed(2)}%
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid var(--border-stone, rgba(160,120,80,0.25))" }}>
              <td colSpan={3} className="px-3 py-2.5 font-medium text-xs" style={{ color: "var(--text-muted)" }}>
                Total
              </td>
              <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {fmt(data.reduce((s, r) => s + r.transaction.amount, 0))}
              </td>
              <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {fmt(data.reduce((s, r) => s + r.current_value, 0))}
              </td>
              <td
                className="px-3 py-2.5 font-mono font-semibold"
                style={{
                  color:
                    data.reduce((s, r) => s + r.gain, 0) >= 0
                      ? "var(--platform-tr, #2E7D6B)"
                      : GRANATE,
                }}
              >
                {data.reduce((s, r) => s + r.gain, 0) >= 0 ? "+" : ""}
                {fmt(data.reduce((s, r) => s + r.gain, 0))}
              </td>
              <td
                className="px-3 py-2.5 font-mono"
                style={{
                  color:
                    data.reduce((s, r) => s + r.gain, 0) >= 0
                      ? "var(--platform-tr, #2E7D6B)"
                      : GRANATE,
                }}
              >
                {(() => {
                  const totalAmount = data.reduce((s, r) => s + r.transaction.amount, 0);
                  const totalGain = data.reduce((s, r) => s + r.gain, 0);
                  const pct = totalAmount > 0 ? (totalGain / totalAmount) * 100 : 0;
                  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
