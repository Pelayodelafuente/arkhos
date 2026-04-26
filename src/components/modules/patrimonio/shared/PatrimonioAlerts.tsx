"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

interface Alert {
  id: string;
  type: "warning" | "info";
  message: string;
}

export function PatrimonioAlerts() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const assets = usePatrimonioStore((s) => s.assets);
  const savingsPlan = usePatrimonioStore((s) => s.savingsPlan);
  const transactions = usePatrimonioStore((s) => s.transactions);

  const alerts = useMemo<Alert[]>(() => {
    const result: Alert[] = [];

    // ── Alerta 1: Concentración alta ────────────────────────────────────────
    const totalPatrimonio = assets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);

    if (totalPatrimonio > 0) {
      assets.forEach((asset) => {
        const pct = (asset.current_value ?? 0) / totalPatrimonio;
        if (pct > 0.25) {
          const pctLabel = (pct * 100).toFixed(0);
          result.push({
            id: `concentration-${asset.id}`,
            type: "warning",
            message: `Concentración alta en ${asset.name} (${pctLabel}% del patrimonio)`,
          });
        }
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
            message: `Plan de ${monthName} pendiente — ${pendingCount} ${pendingCount === 1 ? "activo sin registrar" : "activos sin registrar"}`,
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
          <span>{alert.message}</span>
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
