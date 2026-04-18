"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input } from "@/components/ui";
import type { IndexaFund, IndexaMonthlyPlan } from "@/types/indexa";

const FUND_TYPE_COLOR: Record<string, string> = {
  equity: "#3B78B0",
  bond: "#7260C4",
  cash: "#888780",
};

interface ContributionFormData {
  fundId: string;
  date: string;
  amount: number;
  shares: number | null;
  pricePerShare: number | null;
  notes: string;
}

export interface RegisterContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ContributionFormData) => Promise<void>;
  funds: IndexaFund[];
  plan: IndexaMonthlyPlan | null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function RegisterContributionModal({
  isOpen,
  onClose,
  onConfirm,
  funds,
  plan,
}: RegisterContributionModalProps) {
  const activeFunds = funds.filter((f) => f.is_active && f.fund_type !== "cash");

  const [fundId, setFundId] = useState(activeFunds[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState<string>(String(plan?.monthly_amount ?? 152));
  const [shares, setShares] = useState<string>("");
  const [pricePerShare, setPricePerShare] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate pricePerShare when amount and shares both have values
  useEffect(() => {
    const amt = parseFloat(amount);
    const sh = parseFloat(shares);
    if (!isNaN(amt) && !isNaN(sh) && sh > 0) {
      setPricePerShare((amt / sh).toFixed(4));
    }
  }, [amount, shares]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFundId(activeFunds[0]?.id ?? "");
      setDate(todayISO());
      setAmount(String(plan?.monthly_amount ?? 152));
      setShares("");
      setPricePerShare("");
      setNotes("");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!fundId) {
      setError("Selecciona un fondo");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("El importe debe ser mayor que 0");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm({
        fundId,
        date,
        amount: parsedAmount,
        shares: shares ? parseFloat(shares) : null,
        pricePerShare: pricePerShare ? parseFloat(pricePerShare) : null,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la aportación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldLabelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--text-muted)",
    marginBottom: 4,
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Registrar aportación"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Confirmar aportación"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Fund selector */}
        <div>
          <label htmlFor="fund-select" style={fieldLabelStyle}>
            Fondo destino
          </label>
          <div className="relative">
            <select
              id="fund-select"
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm border outline-none appearance-none cursor-pointer"
              style={{
                backgroundColor: "var(--bg-page)",
                borderColor: "var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
            >
              {activeFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {/* Color indicator */}
            {fundId && (
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full pointer-events-none"
                style={{
                  backgroundColor:
                    FUND_TYPE_COLOR[activeFunds.find((f) => f.id === fundId)?.fund_type ?? "equity"] ?? "#888780",
                }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="contrib-date" style={fieldLabelStyle}>
            Fecha de la aportación
          </label>
          <Input
            id="contrib-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="contrib-amount" style={fieldLabelStyle}>
            Importe (€)
          </label>
          <Input
            id="contrib-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(plan?.monthly_amount ?? 152)}
          />
        </div>

        {/* Shares & price row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="contrib-shares" style={fieldLabelStyle}>
              Participaciones
            </label>
            <Input
              id="contrib-shares"
              type="number"
              min="0"
              step="0.0001"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <label htmlFor="contrib-price" style={fieldLabelStyle}>
              Precio/participación
            </label>
            <Input
              id="contrib-price"
              type="number"
              min="0"
              step="0.0001"
              value={pricePerShare}
              onChange={(e) => setPricePerShare(e.target.value)}
              placeholder="Auto"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="contrib-notes" style={fieldLabelStyle}>
            Notas
          </label>
          <textarea
            id="contrib-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Opcional..."
            className="w-full rounded-lg px-3 py-2 text-sm border outline-none resize-none"
            style={{
              backgroundColor: "var(--bg-page)",
              borderColor: "var(--border-stone, rgba(160,120,80,0.25))",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {error && (
          <p className="text-xs font-medium" style={{ color: "#A32D2D" }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
