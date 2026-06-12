"use client";

import { useState } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { updatePlatformValueAction } from "@/app/actions/patrimonio";
import { useUIStore } from "@/stores/ui-store";

interface ManualPriceUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  platformSlug: string;
  platformName: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ManualPriceUpdateModal({
  isOpen,
  onClose,
  platformSlug,
  platformName,
}: ManualPriceUpdateModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setValue("");
      setDate(today());
      setError("");
    }
  }

  async function handleSave() {
    const numValue = parseFloat(value);
    if (!value || isNaN(numValue) || numValue <= 0) {
      setError("Introduce un valor válido mayor que 0");
      return;
    }

    setLoading(true);
    try {
      const result = await updatePlatformValueAction(platformSlug, numValue);
      if (result.success) {
        addToast(`Valor de ${platformName} actualizado a ${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(numValue)}`, "success");
        onClose();
      } else {
        addToast("Error al actualizar el valor", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={loading}>
        {loading ? "Guardando…" : "Actualizar valor"}
      </Button>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Actualizar valor — ${platformName}`}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Valor total actual de tu cartera en {platformName}
          </label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder="0.00"
              className="font-mono pr-8"
              style={{ color: "var(--module-patrimonio)" }}
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              €
            </span>
          </div>
          {error && (
            <p className="mt-1 text-xs" style={{ color: "var(--module-proyectos)" }}>
              {error}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Fecha del valor
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Este valor se usará como precio de referencia para calcular el patrimonio total y las variaciones de rendimiento.
        </p>
      </div>
    </Modal>
  );
}
