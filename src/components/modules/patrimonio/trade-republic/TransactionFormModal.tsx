"use client";

import { useState } from "react";
import { Modal, Button, Input, Select, Textarea } from "@/components/ui";
import { addTransaction, updateTransaction } from "@/app/actions/patrimonio";
import { useUIStore } from "@/stores/ui-store";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PortfolioTransaction, TransactionType } from "@/types/patrimonio";

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  platformId: string;
  transaction?: PortfolioTransaction;
}

interface FormValues {
  type: TransactionType | "";
  date: string;
  quantity: string;
  price: string;
  total: string;
  totalEdited: boolean;
  notes: string;
}

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: "buy", label: "Compra" },
  { value: "savings_plan", label: "Plan ahorro" },
  { value: "sell", label: "Venta" },
  { value: "saveback", label: "Saveback" },
];

const today = () => new Date().toISOString().slice(0, 10);

function emptyForm(): FormValues {
  return {
    type: "",
    date: today(),
    quantity: "",
    price: "",
    total: "",
    totalEdited: false,
    notes: "",
  };
}

function txToForm(tx: PortfolioTransaction): FormValues {
  return {
    type: tx.type,
    date: tx.transaction_date,
    quantity: tx.quantity != null ? String(tx.quantity) : "",
    price: tx.price_per_unit != null ? String(tx.price_per_unit) : "",
    total: String(tx.total_amount),
    totalEdited: false,
    notes: tx.notes ?? "",
  };
}

export function TransactionFormModal({
  isOpen,
  onClose,
  assetId,
  platformId,
  transaction,
}: TransactionFormModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const setAssets = usePatrimonioStore((s) => s.setAssets);
  const setTransactions = usePatrimonioStore((s) => s.setTransactions);
  const setSnapshots = usePatrimonioStore((s) => s.setSnapshots);
  const setOverview = usePatrimonioStore((s) => s.setOverview);
  const [form, setForm] = useState<FormValues>(transaction ? txToForm(transaction) : emptyForm());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  const [prevSync, setPrevSync] = useState({ isOpen, transaction });
  if (isOpen !== prevSync.isOpen || transaction !== prevSync.transaction) {
    setPrevSync({ isOpen, transaction });
    if (isOpen) {
      setForm(transaction ? txToForm(transaction) : emptyForm());
      setErrors({});
    }
  }

  const isEdit = Boolean(transaction);

  function set(field: keyof FormValues, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if ((field === "quantity" || field === "price") && !prev.totalEdited) {
        const qty = parseFloat(field === "quantity" ? (value as string) : next.quantity) || 0;
        const prc = parseFloat(field === "price" ? (value as string) : next.price) || 0;
        if (qty > 0 && prc > 0) {
          next.total = (qty * prc).toFixed(2);
        }
      }

      if (field === "total") {
        next.totalEdited = true;
      }

      return next;
    });
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormValues, string>> = {};
    if (!form.type) errs.type = "El tipo es obligatorio";
    if (!form.date) errs.date = "La fecha es obligatoria";
    if (!form.quantity || parseFloat(form.quantity) <= 0) errs.quantity = "La cantidad debe ser mayor que 0";
    if (!form.price || parseFloat(form.price) <= 0) errs.price = "El precio debe ser mayor que 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const qty = parseFloat(form.quantity);
    const prc = parseFloat(form.price);
    const total = form.totalEdited && form.total ? parseFloat(form.total) : qty * prc;

    setLoading(true);
    try {
      if (isEdit && transaction) {
        const result = await updateTransaction(transaction.id, {
          type: form.type as TransactionType,
          transaction_date: form.date,
          quantity: qty,
          price_per_unit: prc,
          total_amount: total,
          notes: form.notes || undefined,
        });
        if (!result.success) {
          addToast(result.error ?? "Error al actualizar la transacción", "error");
          return;
        }
        if (result.data) {
          setAssets(result.data.assets);
          setTransactions(result.data.transactions);
          setSnapshots(result.data.snapshots);
          if (result.data.overview) setOverview(result.data.overview);
        }
        addToast("Transacción actualizada", "success");
      } else {
        const result = await addTransaction({
          asset_id: assetId,
          platform_id: platformId,
          type: form.type as TransactionType,
          transaction_date: form.date,
          quantity: qty,
          price_per_unit: prc,
          total_amount: total,
          notes: form.notes || undefined,
        });
        if (!result.success) {
          addToast(result.error ?? "Error al añadir la transacción", "error");
          return;
        }
        if (result.data) {
          setAssets(result.data.assets);
          setTransactions(result.data.transactions);
          setSnapshots(result.data.snapshots);
          if (result.data.overview) setOverview(result.data.overview);
        }
        addToast("Transacción añadida", "success");
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const computedTotal =
    form.quantity && form.price && !form.totalEdited
      ? ((parseFloat(form.quantity) || 0) * (parseFloat(form.price) || 0)).toFixed(2)
      : form.total;

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={loading}>
        {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Añadir transacción"}
      </Button>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEdit ? "Editar transacción" : "Nueva transacción"}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        {/* Tipo + Fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Tipo <span style={{ color: "var(--module-patrimonio)" }}>*</span>
            </label>
            <Select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              options={TRANSACTION_TYPES}
              placeholder="Seleccionar…"
            />
            {errors.type && (
              <p className="mt-1 text-xs" style={{ color: "var(--module-proyectos)" }}>
                {errors.type}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Fecha <span style={{ color: "var(--module-patrimonio)" }}>*</span>
            </label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
            {errors.date && (
              <p className="mt-1 text-xs" style={{ color: "var(--module-proyectos)" }}>
                {errors.date}
              </p>
            )}
          </div>
        </div>

        {/* Cantidad + Precio */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Cantidad <span style={{ color: "var(--module-patrimonio)" }}>*</span>
            </label>
            <Input
              type="number"
              step="0.00000001"
              min="0"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder="0.00000000"
              className="font-mono"
            />
            {errors.quantity && (
              <p className="mt-1 text-xs" style={{ color: "var(--module-proyectos)" }}>
                {errors.quantity}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Precio/ud <span style={{ color: "var(--module-patrimonio)" }}>*</span>
            </label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0.000000"
              className="font-mono"
            />
            {errors.price && (
              <p className="mt-1 text-xs" style={{ color: "var(--module-proyectos)" }}>
                {errors.price}
              </p>
            )}
          </div>
        </div>

        {/* Total */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Total €
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={computedTotal}
            onChange={(e) => set("total", e.target.value)}
            placeholder="0.00"
            className="font-mono"
            style={{ color: "var(--module-patrimonio)" }}
          />
        </div>

        {/* Notas */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Notas
          </label>
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Nota opcional…"
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
}
