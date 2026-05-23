"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

interface Alert {
  id: string;
  type: "warning" | "info";
  label: string;
  monoValue?: string;
  labelSuffix?: string;
}

export function PatrimonioAlerts() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const assets = usePatrimonioStore((s) => s.assets);
  const savingsPlan = usePatrimonioStore((s) => s.savingsPlan);
  const transactions = usePatrimonioStore((s) => s.transactions);

  const alerts = useMemo<Alert[]>(() => {
    const result: Alert[] = [];

    // ── Alerta 1: Concentración alta (sobre carteraInvertida, sin efectivo) ──
    const investedAssets = assets.filter((a) => a.category !== "cash");
    const totalInvested = investedAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);

    if (totalInvested > 0) {
      investedAssets.forEach((asset) => {
        const pct = (asset.current_value ?? 0) / totalInvested;
        if (pct > 0.25) {
          result.push({
            id: `concentration-${asset.id}`,
            type: "warning",
            label: `Concentración alta en ${asset.name}`,
            monoValue: `${(pct * 100).toFixed(0)}% de la cartera`,
          });
        }
      });
    }

    // ── Nota: liquidez elevada ────────────────────────────────────────────────
    const totalCash = assets
      .filter((a) => a.category === "cash")
      .reduce((sum, a) => sum + (a.current_value ?? 0), 0);
    const totalPatrimonio = totalInvested + totalCash;
    if (totalPatrimonio > 0 && totalCash / totalPatrimonio > 0.4) {
      result.push({
        id: "high-cash",
        type: "info",
        label: "Liquidez elevada:",
        monoValue: `${((totalCash / totalPatrimonio) * 100).toFixed(0)}%`,
        labelSuffix: "del patrimonio en efectivo",
      });
    }

    // ── Alerta 2: Plan mensual pendiente ────────────────────────────────────
    const today = new Date();
    if (today.getDate() >= 5) {
      const activePlanItems = savingsPlan.filter((item) => item.is_active);

      if (activePlanItems.length > 0) {
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const planTransactionsThisMonth = new Set(
          transactions
            .filter((tx) => {
              if (tx.type !== "savings_plan") return false;
              const txDate = new Date(tx.transaction_date);
              return (
                txDate.getMonth() === currentMonth &&
                txDate.getFullYear() === currentYear
              );
            })
            .map((tx) => tx.asset_id)
        );

        const pendingCount = activePlanItems.filter(
          (item) => !planTransactionsThisMonth.has(item.asset_id)
        ).length;

        if (pendingCount > 0) {
          const monthName = today.toLocaleString("es-ES", { month: "long" });
          result.push({
            id: `savings-plan-pending-${currentYear}-${currentMonth}`,
            type: "info",
            label: `Plan de ${monthName} pendiente —`,
            monoValue: String(pendingCount),
            labelSuffix: pendingCount === 1 ? "activo sin registrar" : "activos sin registrar",
          });
        }
      }
    }

    return result;
  }, [assets, savingsPlan, transactions]);

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Alertas de patrimonio">
      {visible.map((alert) => (
        <div
          key={alert.id}
          role="listitem"
          className="flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm"
          style={
            alert.type === "warning"
              ? {
                  backgroundColor: "var(--color-neutral-subtle)",
                  border: "1px solid var(--color-neutral-border)",
                  color: "var(--color-neutral-fin)",
                }
              : {
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-stone)",
                  color: "var(--text-secondary)",
                }
          }
        >
          <span>
            {alert.label}
            {alert.monoValue && (
              <span className="font-mono mx-1">{alert.monoValue}</span>
            )}
            {alert.labelSuffix}
          </span>
          <button
            type="button"
            onClick={() => dismiss(alert.id)}
            className="flex-shrink-0 rounded p-0.5 transition-opacity duration-150 hover:opacity-60"
            aria-label="Descartar alerta"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
