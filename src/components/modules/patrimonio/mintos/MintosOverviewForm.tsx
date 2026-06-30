"use client";

import { useState } from "react";
import { Edit3, Check, X } from "lucide-react";
import { useMintosStore } from "@/stores/mintos-store";
import { updateMintosOverview } from "@/app/actions/mintos";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

export function MintosOverviewForm() {
  const overview = useMintosStore((s) => s.overview);
  const setOverview = useMintosStore((s) => s.setOverview);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalValue, setTotalValue] = useState("");
  const [investedInLoans, setInvestedInLoans] = useState("");
  const [pendingPayments, setPendingPayments] = useState("");
  const [activeLoans, setActiveLoans] = useState("");
  const [avgRate, setAvgRate] = useState("");

  function openEdit() {
    setTotalValue(overview?.total_value?.toString() ?? "");
    setInvestedInLoans(overview?.invested_in_loans?.toString() ?? "");
    setPendingPayments(overview?.pending_payments?.toString() ?? "");
    setActiveLoans(overview?.active_loans_count?.toString() ?? "");
    setAvgRate(overview?.avg_interest_rate?.toString() ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await updateMintosOverview({
      total_value: parseFloat(totalValue) || (overview?.total_value ?? 0),
      invested_in_loans: parseFloat(investedInLoans) || undefined,
      pending_payments: parseFloat(pendingPayments) || undefined,
      active_loans_count: parseInt(activeLoans, 10) || undefined,
      avg_interest_rate: parseFloat(avgRate) || undefined,
    });

    if (!res.success) {
      setError(res.error ?? "Error al guardar");
      setSaving(false);
      return;
    }

    // Actualiza el store directamente con lo devuelto por la Server Action
    // (sin volver a pedir todos los datos — la megacarga ya no se repite al navegar)
    if (res.overview) setOverview(res.overview);

    setSaving(false);
    setEditing(false);
  }

  if (!overview) return null;

  const fields = [
    { label: "En préstamos", value: overview.invested_in_loans },
    { label: "Caja disponible", value: overview.cash_balance },
    { label: "Pagos pendientes", value: overview.pending_payments },
    { label: "Préstamos activos", value: overview.active_loans_count, isCount: true },
  ];

  return (
    <div className="space-y-3">
      {/* Read-only cards + edit button */}
      {!editing && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fields.map(({ label, value, isCount }) => (
            <div
              key={label}
              className="rounded-xl p-4 flex flex-col gap-1"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
              }}
            >
              <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {label}
              </span>
              <span className="font-mono text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {isCount
                  ? (value as number).toLocaleString("es-ES")
                  : fmt(value as number)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Actualizar snapshot de cartera
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Valor total (€)", val: totalValue, set: setTotalValue },
              { label: "En préstamos (€)", val: investedInLoans, set: setInvestedInLoans },
              { label: "Pagos pendientes (€)", val: pendingPayments, set: setPendingPayments },
              { label: "Préstamos activos", val: activeLoans, set: setActiveLoans },
              { label: "Tipo interés medio (%)", val: avgRate, set: setAvgRate },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm font-mono w-full"
                  style={{
                    backgroundColor: "var(--bg-surface, var(--bg-card))",
                    border: "1px solid var(--border-stone, rgba(160,120,80,0.35))",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
            ))}
          </div>
          {error && <p className="text-xs" style={{ color: "#A32D2D" }}>{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "var(--platform-mintos)", color: "#fff" }}
            >
              <Check size={14} />
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-secondary)",
              }}
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Edit trigger */}
      {!editing && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openEdit}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
            style={{
              border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
              color: "var(--text-muted)",
            }}
          >
            <Edit3 size={12} />
            Actualizar datos en vivo
          </button>
        </div>
      )}
    </div>
  );
}
