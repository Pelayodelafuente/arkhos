"use client";

import { useMemo } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type CellState = "completed" | "missing" | "pending";

interface CalendarColumn {
  year: number;
  monthIndex: number; // 0-based
  label: string;
}

function buildColumns(): CalendarColumn[] {
  const today = new Date();
  const cols: CalendarColumn[] = [];
  // 6 past months + current month = 7 columns
  for (let offset = -6; offset <= 0; offset++) {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    cols.push({
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      label: MONTH_LABELS[d.getMonth()],
    });
  }
  return cols;
}

function getCellState(col: CalendarColumn, hasTransaction: boolean): CellState {
  const today = new Date();
  const cellDate = new Date(col.year, col.monthIndex, 1);
  // Future month (strictly after current month start)
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  if (cellDate > currentMonthStart) return "pending";
  if (hasTransaction) return "completed";
  return "missing";
}

// ── Cell component ────────────────────────────────────────────────────────────

function Cell({ state }: { state: CellState }) {
  if (state === "completed") {
    return (
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-gain, #3B7A57) 12%, transparent)",
          color: "var(--color-gain, #3B7A57)",
        }}
        aria-label="Ejecutado"
      >
        ✓
      </div>
    );
  }
  if (state === "missing") {
    return (
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-loss, #A32D2D) 10%, transparent)",
          color: "var(--color-loss, #A32D2D)",
        }}
        aria-label="Pendiente sin registrar"
      >
        ✗
      </div>
    );
  }
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
      style={{ color: "var(--text-tertiary, var(--text-muted))" }}
      aria-label="Mes futuro"
    >
      ·
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlanCalendar() {
  const savingsPlan = usePatrimonioStore((s) => s.savingsPlan);
  const transactions = usePatrimonioStore((s) => s.transactions);

  const columns = useMemo(() => buildColumns(), []);

  const activeItems = useMemo(
    () => savingsPlan.filter((item) => item.is_active),
    [savingsPlan]
  );

  // Build a Set of "assetId-year-month" for savings_plan transactions
  const txSet = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      if (tx.type === "savings_plan" && tx.asset_id) {
        const d = new Date(tx.transaction_date);
        const key = `${tx.asset_id}-${d.getFullYear()}-${d.getMonth()}`;
        set.add(key);
      }
    }
    return set;
  }, [transactions]);

  // Current month missing count for banner
  const today = useMemo(() => new Date(), []);
  const currentMonth = today.getMonth();
  const currentMonthLabel = MONTH_LABELS[currentMonth];

  const missingThisMonth = useMemo(
    () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      return activeItems.filter((item) => {
        const key = `${item.asset_id}-${year}-${month}`;
        return !txSet.has(key);
      });
    },
    [activeItems, txSet]
  );

  if (activeItems.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No hay activos en el plan de ahorro
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner */}
      {missingThisMonth.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            backgroundColor: "color-mix(in srgb, #C8A84B 8%, transparent)",
            border: "1px solid rgba(200,168,75,0.3)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="flex-shrink-0"
            aria-hidden="true"
          >
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="#C8A84B"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm" style={{ color: "#7A6220" }}>
            Plan de {currentMonthLabel} pendiente —{" "}
            <strong>{missingThisMonth.length}</strong>{" "}
            {missingThisMonth.length === 1 ? "activo sin registrar" : "activos sin registrar"}
          </p>
        </div>
      )}

      {/* Grid */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr
                style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.2))" }}
              >
                {/* Asset name column */}
                <th
                  className="px-4 py-3 text-left font-medium min-w-[140px]"
                  style={{ color: "var(--text-tertiary, var(--text-muted))" }}
                >
                  Activo
                </th>
                {columns.map((col) => (
                  <th
                    key={`${col.year}-${col.monthIndex}`}
                    className="px-2 py-3 text-center font-medium min-w-[48px]"
                    style={{ color: "var(--text-tertiary, var(--text-muted))" }}
                  >
                    <span>{col.label}</span>
                    {col.year !== today.getFullYear() && (
                      <span className="block text-[10px] leading-tight">
                        {String(col.year).slice(2)}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item) => {
                const assetName = item.asset?.name ?? `Activo ${item.asset_id.slice(0, 8)}`;
                const assetTicker = item.asset?.ticker;

                return (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.08))" }}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p
                          className="text-xs font-medium leading-tight"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {assetName}
                        </p>
                        {assetTicker && (
                          <p
                            className="font-mono text-[10px] leading-tight mt-0.5"
                            style={{ color: "var(--text-tertiary, var(--text-muted))" }}
                          >
                            {assetTicker}
                          </p>
                        )}
                      </div>
                    </td>
                    {columns.map((col) => {
                      const key = `${item.asset_id}-${col.year}-${col.monthIndex}`;
                      const hasTransaction = txSet.has(key);
                      const state = getCellState(col, hasTransaction);
                      return (
                        <td
                          key={`${col.year}-${col.monthIndex}`}
                          className="px-2 py-3 text-center"
                        >
                          <div className="flex justify-center">
                            <Cell state={state} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div
          className="flex items-center gap-4 px-4 py-2.5 flex-wrap"
          style={{ borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-gain, #3B7A57) 12%, transparent)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-tertiary, var(--text-muted))" }}>
              Ejecutado
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-loss, #A32D2D) 10%, transparent)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-tertiary, var(--text-muted))" }}>
              Sin registrar
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--text-tertiary, var(--text-muted))" }}>
              · Mes futuro
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
