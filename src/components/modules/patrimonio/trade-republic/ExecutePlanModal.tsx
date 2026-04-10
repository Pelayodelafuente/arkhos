"use client";

import { useState, useMemo } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { executeSavingsPlan, type PlanExecution } from "@/app/actions/patrimonio";
import { useUIStore } from "@/stores/ui-store";

interface ExecutePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RowState {
  quantity: string;
  price: string;
  date: string;
  totalEdited: boolean;
  total: string;
}

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const today = () => new Date().toISOString().slice(0, 10);

export function ExecutePlanModal({ isOpen, onClose }: ExecutePlanModalProps) {
  const savingsPlan = usePatrimonioStore((s) => s.savingsPlan);
  const assets = usePatrimonioStore((s) => s.assets);
  const addToast = useUIStore((s) => s.addToast);

  const activePlan = useMemo(
    () =>
      [...savingsPlan]
        .filter((item) => item.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    [savingsPlan]
  );

  const initialRows = useMemo<Record<string, RowState>>(
    () =>
      Object.fromEntries(
        activePlan.map((item) => [
          item.id,
          { quantity: "", price: "", date: today(), totalEdited: false, total: "" },
        ])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen]
  );

  const [rows, setRows] = useState<Record<string, RowState>>(initialRows);
  const [loading, setLoading] = useState(false);

  function updateRow(id: string, field: keyof RowState, value: string) {
    setRows((prev) => {
      const row = { ...prev[id], [field]: value };

      if (field === "quantity" || field === "price") {
        if (!row.totalEdited) {
          const qty = parseFloat(row.quantity) || 0;
          const prc = parseFloat(row.price) || 0;
          row.total = qty > 0 && prc > 0 ? (qty * prc).toFixed(2) : "";
        }
      }

      if (field === "total") {
        row.totalEdited = true;
      }

      return { ...prev, [id]: row };
    });
  }

  const grandTotal = useMemo(() => {
    return activePlan.reduce((sum, item) => {
      const row = rows[item.id];
      if (!row) return sum;
      const val = parseFloat(row.total) || 0;
      return sum + val;
    }, 0);
  }, [rows, activePlan]);

  const validCount = useMemo(() => {
    return activePlan.filter((item) => {
      const row = rows[item.id];
      return row && parseFloat(row.quantity) > 0;
    }).length;
  }, [rows, activePlan]);

  async function handleConfirm() {
    if (validCount === 0) return;

    const executions: PlanExecution[] = activePlan
      .filter((item) => {
        const row = rows[item.id];
        return row && parseFloat(row.quantity) > 0;
      })
      .map((item) => {
        const row = rows[item.id];
        const qty = parseFloat(row.quantity);
        const prc = parseFloat(row.price) || 0;
        const total = parseFloat(row.total) || qty * prc;
        return {
          assetId: item.asset_id,
          quantity: qty,
          pricePerUnit: prc,
          totalAmount: total,
          date: row.date,
        };
      });

    setLoading(true);
    try {
      const result = await executeSavingsPlan(executions);
      if (result.success) {
        addToast(
          `${executions.length} ejecuci${executions.length === 1 ? "ón" : "ones"} registradas — Plan ejecutado`,
          "success"
        );
        onClose();
      } else {
        addToast(result.error ?? "Error al ejecutar el plan", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  const footer = (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Total a invertir
        </p>
        <p
          className="font-mono text-lg font-semibold"
          style={{ color: "var(--module-patrimonio)" }}
        >
          {fmt.format(grandTotal)}
        </p>
      </div>
      <Button
        onClick={handleConfirm}
        disabled={loading || validCount === 0}
        variant="primary"
      >
        {loading ? "Registrando…" : `Confirmar ${validCount} ejecuci${validCount === 1 ? "ón" : "ones"}`}
      </Button>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Registrar ejecución mensual del plan"
      footer={footer}
      className="max-w-2xl"
    >
      {activePlan.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No hay activos activos en el plan de ahorro.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {activePlan.map((item) => {
            const asset = assets.find((a) => a.id === item.asset_id);
            const row = rows[item.id] ?? {
              quantity: "",
              price: "",
              date: today(),
              totalEdited: false,
              total: "",
            };
            const name = asset?.name ?? "Activo desconocido";
            const displayName = name.length > 30 ? name.slice(0, 30) + "…" : name;
            const qty = parseFloat(row.quantity) || 0;
            const prc = parseFloat(row.price) || 0;
            const computedTotal = row.totalEdited
              ? parseFloat(row.total) || 0
              : qty * prc;

            return (
              <div
                key={item.id}
                className="rounded-xl border p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {displayName}
                  </span>
                  {asset?.ticker && (
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {asset.ticker}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label
                      className="mb-1 block text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Cantidad
                    </label>
                    <Input
                      type="number"
                      step="0.00000001"
                      min="0"
                      placeholder="0.000000"
                      value={row.quantity}
                      onChange={(e) => updateRow(item.id, "quantity", e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Precio/ud
                    </label>
                    <Input
                      type="number"
                      step="0.000001"
                      min="0"
                      placeholder="0.00"
                      value={row.price}
                      onChange={(e) => updateRow(item.id, "price", e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total €
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={row.totalEdited ? row.total : computedTotal > 0 ? computedTotal.toFixed(2) : ""}
                      onChange={(e) => updateRow(item.id, "total", e.target.value)}
                      className="font-mono text-sm"
                      style={{ color: "var(--module-patrimonio)" }}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Fecha
                    </label>
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(item.id, "date", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
