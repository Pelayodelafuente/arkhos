"use client";

import { useMemo, useState } from "react";
import { CalendarDays, PlayCircle } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { toggleSavingsPlanItem, updateSavingsPlanAmount } from "@/app/actions/patrimonio";
import { ExecutePlanModal } from "./ExecutePlanModal";
import type { SavingsPlanItem } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

// Inline editable amount cell
function EditableAmount({ item }: { item: SavingsPlanItem }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.monthly_amount.toString());
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const num = parseFloat(value.replace(",", "."));
    if (isNaN(num) || num <= 0 || num === item.monthly_amount) {
      setValue(item.monthly_amount.toString());
      setEditing(false);
      return;
    }
    setSaving(true);
    await updateSavingsPlanAmount(item.id, num);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        type="number"
        min="1"
        step="1"
        className="w-20 rounded border border-border bg-background px-2 py-0.5 text-right font-mono text-xs text-foreground focus:outline-none"
        style={{ borderColor: "var(--module-patrimonio)" }}
        value={value}
        autoFocus
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") { setValue(item.monthly_amount.toString()); setEditing(false); }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      title="Click para editar"
      className="font-mono font-medium text-foreground transition-colors hover:text-[color:var(--module-patrimonio)]"
      onClick={() => { setValue(item.monthly_amount.toString()); setEditing(true); }}
    >
      {formatEur(item.monthly_amount)}
    </button>
  );
}

// Toggle active/inactive
function ActiveToggle({ item }: { item: SavingsPlanItem }) {
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    await toggleSavingsPlanItem(item.id, !item.is_active);
    setPending(false);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={item.is_active}
      title={item.is_active ? "Desactivar" : "Activar"}
      disabled={pending}
      onClick={handleToggle}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
      style={{
        backgroundColor: item.is_active ? "var(--module-patrimonio)" : "var(--border)",
      }}
    >
      <span
        className="inline-block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-card shadow transition-transform"
        style={{ transform: item.is_active ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

export function SavingsPlanPanel() {
  const savingsPlan = usePatrimonioStore((s) => s.savingsPlan);
  const assets = usePatrimonioStore((s) => s.assets);
  const [showExecuteModal, setShowExecuteModal] = useState(false);

  const totalMonthly = useMemo(
    () => savingsPlan.filter((item) => item.is_active).reduce((sum, item) => sum + item.monthly_amount, 0),
    [savingsPlan]
  );

  const assetMap = new Map(assets.map((a) => [a.id, a]));

  if (savingsPlan.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-text-tertiary">Sin plan de ahorro activo</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} strokeWidth={1.75} style={{ color: "var(--module-patrimonio)" }} aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">Plan de Ahorro Activo</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-tertiary">
              Día 2 de cada mes ·{" "}
              <span className="font-mono font-medium" style={{ color: "var(--module-patrimonio)" }}>
                {formatEur(totalMonthly)}/mes
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowExecuteModal(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: "rgba(46,125,107,0.1)",
                color: "var(--module-patrimonio)",
                border: "1px solid rgba(46,125,107,0.25)",
              }}
            >
              <PlayCircle size={13} strokeWidth={1.75} />
              Registrar ejecución
            </button>
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
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-sand/50"
                    style={{ opacity: item.is_active ? 1 : 0.5 }}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{asset?.name ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-text-tertiary">{asset?.isin ?? "—"}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <EditableAmount item={item} />
                    </td>
                    <td className="px-3 py-3 text-text-secondary">{startDate}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <ActiveToggle item={item} />
                        <span className="text-text-tertiary">
                          {item.is_active ? "Activo" : "Pausado"}
                        </span>
                      </div>
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

      <ExecutePlanModal
        isOpen={showExecuteModal}
        onClose={() => setShowExecuteModal(false)}
      />
    </>
  );
}
