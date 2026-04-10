"use client";

import { CalendarDays } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

export function SavingsPlanPanel() {
  const savingsPlan = usePatrimonioStore((s) => s.savingsPlan);
  const totalMonthly = usePatrimonioStore((s) => s.getTotalMonthlyPlan());
  const assets = usePatrimonioStore((s) => s.assets);

  const assetMap = new Map(assets.map((a) => [a.id, a]));

  if (savingsPlan.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-text-tertiary">Sin plan de ahorro activo</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} strokeWidth={1.75} style={{ color: "var(--module-patrimonio)" }} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Plan de Ahorro Activo</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span>Dia 2 de cada mes</span>
          <span className="font-mono font-medium" style={{ color: "var(--module-patrimonio)" }}>
            {formatEur(totalMonthly)}/mes
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-2.5 text-left font-medium text-text-tertiary">Activo</th>
              <th className="px-3 py-2.5 text-left font-medium text-text-tertiary">ISIN</th>
              <th className="px-3 py-2.5 text-right font-medium text-text-tertiary">EUR/mes</th>
              <th className="px-3 py-2.5 text-left font-medium text-text-tertiary">Inicio</th>
              <th className="px-5 py-2.5 text-center font-medium text-text-tertiary">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {savingsPlan.map((item) => {
              const asset = assetMap.get(item.asset_id);
              const startDate = item.started_at
                ? new Date(item.started_at).toLocaleDateString("es-ES", {
                    month: "short",
                    year: "numeric",
                  })
                : "—";
              return (
                <tr key={item.id} className="hover:bg-sand/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">
                      {asset?.name ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-text-tertiary">{asset?.isin ?? "—"}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-mono font-medium text-foreground">
                      {formatEur(item.monthly_amount)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-text-secondary">{startDate}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "rgba(46,125,107,0.12)",
                        color: "var(--module-patrimonio)",
                        border: "1px solid rgba(46,125,107,0.25)",
                      }}
                    >
                      Activo
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-sand/30">
              <td className="px-5 py-3 font-semibold text-foreground" colSpan={2}>
                Total mensual
              </td>
              <td className="px-3 py-3 text-right font-mono font-semibold text-foreground">
                {formatEur(totalMonthly)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
