"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { formatPct } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RebalanceoRow {
  assetId: string;
  ticker: string;
  name: string;
  currentWeight: number;   // % of non-cash portfolio
  targetWeight: number;    // % derived from savings plan amounts
  deviation: number;       // currentWeight - targetWeight (percentage points)
  currentValue: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RebalanceoPanel() {
  const savingsPlan = usePatrimonioStore((s) => s.savingsPlan);
  const getTRAssets = usePatrimonioStore((s) => s.getTRAssets);
  const getTRInvestmentValue = usePatrimonioStore((s) => s.getTRInvestmentValue);

  const totalPortfolioValue = getTRInvestmentValue();

  const activePlan = useMemo(
    () => savingsPlan.filter((item) => item.is_active),
    [savingsPlan],
  );

  const trAssets = useMemo(() => getTRAssets(), [getTRAssets]);

  const rows: RebalanceoRow[] = useMemo(() => {
    if (activePlan.length === 0 || totalPortfolioValue <= 0) return [];

    const totalMonthly = activePlan.reduce((sum, item) => sum + item.monthly_amount, 0);
    if (totalMonthly <= 0) return [];

    return activePlan.map((planItem) => {
      const asset = trAssets.find((a) => a.id === planItem.asset_id) ?? planItem.asset;
      const currentValue = asset?.current_value ?? 0;
      const currentWeight = (currentValue / totalPortfolioValue) * 100;
      const targetWeight = (planItem.monthly_amount / totalMonthly) * 100;
      const deviation = currentWeight - targetWeight;

      return {
        assetId: planItem.asset_id,
        ticker: asset?.ticker ?? planItem.asset?.ticker ?? "—",
        name: asset?.name ?? planItem.asset?.name ?? planItem.asset_id,
        currentWeight,
        targetWeight,
        deviation,
        currentValue,
      };
    });
  }, [activePlan, trAssets, totalPortfolioValue]);

  // No plan configured
  if (activePlan.length === 0) {
    return (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Sin plan de ahorro activo
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
          Configura un plan de ahorro en la pestana Plan de Ahorro para ver el seguimiento del
          rebalanceo.
        </p>
      </div>
    );
  }

  if (totalPortfolioValue <= 0) {
    return (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Sin valor de cartera disponible
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
          El cálculo de rebalanceo requiere que haya posiciones con precio actualizado.
        </p>
      </div>
    );
  }

  const alertCount = rows.filter((r) => Math.abs(r.deviation) > 5).length;

  return (
    <div className="space-y-3">
      {/* Summary badge */}
      {alertCount > 0 && (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor: "#e8a0a0",
            backgroundColor: "var(--error-bg)",
            color: "#7a1a1a",
          }}
        >
          <span
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: "#c53030" }}
          >
            {alertCount}
          </span>
          <span>
            {alertCount === 1
              ? "1 activo con desviación superior a ±5 pp"
              : `${alertCount} activos con desviación superior a ±5 pp`}
          </span>
        </div>
      )}

      {/* Rows */}
      <div className="space-y-3">
        {rows.map((row) => {
          const isAlert = Math.abs(row.deviation) > 5;
          const isOver = row.deviation > 0;
          const deviationColor = isAlert
            ? isOver
              ? "#c53030"
              : "#1a6b50"
            : "var(--text-secondary)";

          // Clamp bar widths to 0-100%
          const currentBarWidth = Math.min(100, Math.max(0, row.currentWeight));
          const targetPct = Math.min(100, Math.max(0, row.targetWeight));

          return (
            <div
              key={row.assetId}
              className="rounded-xl border p-4"
              style={{
                borderColor: isAlert ? (isOver ? "#e8a0a0" : "#a0d4c0") : "var(--border)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              {/* Header */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {row.name}
                  </p>
                  <p className="font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {row.ticker}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {isAlert && (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-semibold"
                      style={{
                        backgroundColor: isOver ? "#fee2e2" : "#d1fae5",
                        color: isOver ? "#991b1b" : "#065f46",
                      }}
                    >
                      {isOver ? "Sobreponderar" : "Infraponderar"}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative mb-2 h-5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--bg-sand)" }}>
                {/* Current weight bar */}
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${currentBarWidth}%`,
                    backgroundColor: isAlert
                      ? isOver
                        ? "#c53030"
                        : "var(--color-gain)"
                      : "var(--module-patrimonio)",
                    opacity: 0.7,
                  }}
                />
                {/* Target marker (dashed vertical line) */}
                <div
                  className="absolute top-0 h-full w-0.5"
                  style={{
                    left: `${targetPct}%`,
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, var(--text-secondary) 0, var(--text-secondary) 3px, transparent 3px, transparent 6px)",
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Weight labels */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span style={{ color: "var(--text-tertiary)" }}>
                  Actual:{" "}
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {formatPct(row.currentWeight)}
                  </span>
                </span>
                <span style={{ color: deviationColor, fontWeight: isAlert ? 700 : 400 }}>
                  {formatPct(row.deviation, true)} desviación
                </span>
                <span style={{ color: "var(--text-tertiary)" }}>
                  Objetivo:{" "}
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {formatPct(row.targetWeight)}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        El peso objetivo se calcula proporcionalmente al importe mensual del plan de ahorro activo.
        Se muestra alerta cuando la desviación supera ±5 puntos porcentuales.
      </p>

      {/* Link to Mi Cartera in Mercados */}
      <div className="flex justify-end">
        <Link
          href="/mercados?tab=portfolio"
          className="text-xs font-medium transition-colors"
          style={{ color: "var(--module-patrimonio)" }}
        >
          Editar objetivos en Mi Cartera →
        </Link>
      </div>
    </div>
  );
}
