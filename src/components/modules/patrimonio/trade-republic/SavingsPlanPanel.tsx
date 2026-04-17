"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { updateSavingsPlanAmount } from "@/app/actions/patrimonio";
import type { SavingsPlanItem } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

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

function getNextContributionLabel(activeItems: SavingsPlanItem[]): string | null {
  if (activeItems.length === 0) return null;
  const executionDay = activeItems[0].execution_day;
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), executionDay);
  const nextDate = thisMonth > now ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, executionDay);
  return nextDate.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

export function SavingsPlanPanel() {
  const savingsPlan = usePatrimonioStore((s) => s.savingsPlan);
  const assets = usePatrimonioStore((s) => s.assets);

  const activeItems = useMemo(() => savingsPlan.filter((item) => item.is_active), [savingsPlan]);

  const totalMonthly = useMemo(
    () => activeItems.reduce((sum, item) => sum + item.monthly_amount, 0),
    [activeItems]
  );

  const nextContributionLabel = useMemo(() => getNextContributionLabel(activeItems), [activeItems]);

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
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-text-tertiary">
            <span className="font-mono font-medium" style={{ color: "var(--module-patrimonio)" }}>
              {formatEur(totalMonthly)}/mes
            </span>
          </span>
          {nextContributionLabel && (
            <span className="text-[10px] text-text-tertiary">
              Próxima aportación: <span className="font-medium text-text-secondary">{nextContributionLabel}</span>
            </span>
          )}
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
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
