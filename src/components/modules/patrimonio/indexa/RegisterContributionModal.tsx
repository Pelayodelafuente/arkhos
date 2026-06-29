"use client";

import { useState } from "react";
import { X, ArrowDownToLine, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import type { IndexaFund, IndexaMonthlyPlan } from "@/types/indexa";

const FUND_TYPE_COLOR: Record<string, string> = {
  equity: "#3B78B0",
  bond: "#7260C4",
  cash: "#888780",
};

import { formatEur } from "@/lib/utils/format";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export interface ContributionFormData {
  fundId: string;
  date: string;
  valueDate: string | null;
  amount: number;
  shares: number;
  pricePerShare: number;
  notes: string;
}

export interface RegisterContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ContributionFormData) => Promise<void>;
  funds: IndexaFund[];
  plan: IndexaMonthlyPlan | null;
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
  const [valueDate, setValueDate] = useState("");
  const [amount, setAmount] = useState(String(plan?.monthly_amount ?? ""));
  const [shares, setShares] = useState("");
  const [pricePerShare, setPricePerShare] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate pricePerShare from amount ÷ shares
  const [prevCalc, setPrevCalc] = useState({ amount, shares });
  if (amount !== prevCalc.amount || shares !== prevCalc.shares) {
    setPrevCalc({ amount, shares });
    const amt = parseFloat(amount);
    const sh = parseFloat(shares);
    if (!isNaN(amt) && !isNaN(sh) && sh > 0) {
      setPricePerShare((amt / sh).toFixed(4));
    }
  }

  // Reset when modal opens
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setFundId(activeFunds[0]?.id ?? "");
      setDate(todayISO());
      setValueDate("");
      setAmount(String(plan?.monthly_amount ?? ""));
      setShares("");
      setPricePerShare("");
      setNotes("");
      setError(null);
      setSubmitStatus("idle");
    }
  }

  const parsedAmount = parseFloat(amount);
  const parsedShares = parseFloat(shares);
  const parsedPrice = parseFloat(pricePerShare);

  const isValid =
    !!fundId &&
    !!date &&
    !isNaN(parsedAmount) && parsedAmount > 0 &&
    !isNaN(parsedShares) && parsedShares > 0 &&
    !isNaN(parsedPrice) && parsedPrice > 0;

  // Preview of new cost + value
  const previewNewValue = isValid ? parsedShares * parsedPrice : null;

  const handleSubmit = async () => {
    if (!isValid) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm({
        fundId,
        date,
        valueDate: valueDate || null,
        amount: parsedAmount,
        shares: parsedShares,
        pricePerShare: parsedPrice,
        notes,
      });
      setSubmitStatus("success");
      setTimeout(onClose, 1000);
    } catch (err) {
      setSubmitStatus("error");
      setError(err instanceof Error ? err.message : "Error al registrar la aportación");
      setTimeout(() => setSubmitStatus("idle"), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedFund = activeFunds.find((f) => f.id === fundId);
  const fundColor = FUND_TYPE_COLOR[selectedFund?.fund_type ?? "equity"] ?? "#3B78B0";

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
    color: "var(--text-primary)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    fontFamily: "var(--font-mono, monospace)",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-muted)",
    marginBottom: 4,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contrib-modal-title"
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="contrib-modal-title" className="font-heading text-lg text-foreground">
              Registrar aportación
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Datos del CSV de Indexa Capital. Actualiza participaciones y coste automáticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-muted"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Fund selector */}
          <div>
            <label style={labelStyle}>Fondo destino *</label>
            <div className="relative">
              <select
                value={fundId}
                onChange={(e) => setFundId(e.target.value)}
                style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
              >
                {activeFunds.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full pointer-events-none"
                style={{ backgroundColor: fundColor }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Fecha suscripción *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Fecha valor (opcional)</label>
              <input
                type="date"
                value={valueDate}
                onChange={(e) => setValueDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Importe (€) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(plan?.monthly_amount ?? "152.00")}
              style={inputStyle}
            />
          </div>

          {/* Shares + price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Participaciones *</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="Ej: 0.28"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Precio/participación *</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                placeholder="Auto"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Preview */}
          {isValid && previewNewValue !== null && (
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs"
              style={{
                backgroundColor: "var(--bg-sand)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.15))",
              }}
            >
              <div>
                <p className="text-muted-foreground">Participaciones nuevas</p>
                <p className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                  +{parsedShares.toFixed(4)} part. × {formatEur(parsedPrice)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Valor añadido</p>
                <p className="font-mono font-semibold" style={{ color: "var(--platform-indexa, #3B78B0)" }}>
                  {formatEur(previewNewValue)}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Aportación mensual mayo 2026..."
              className="resize-none outline-none"
              style={{ ...inputStyle, fontFamily: "inherit", resize: "none" }}
            />
          </div>

          {error && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs"
              style={{
                backgroundColor: "rgba(163,45,45,0.08)",
                color: "#A32D2D",
                border: "1px solid rgba(163,45,45,0.15)",
              }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--bg-sand)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-stone, rgba(160,120,80,0.20))",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting || submitStatus === "success"}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: submitStatus === "success"
                ? "rgba(46,125,107,0.12)"
                : "rgba(59,120,176,0.12)",
              color: submitStatus === "success" ? "var(--platform-tr, #2E7D6B)" : "#3B78B0",
              border: submitStatus === "success"
                ? "1px solid rgba(46,125,107,0.25)"
                : "1px solid rgba(59,120,176,0.25)",
            }}
          >
            {isSubmitting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : submitStatus === "success" ? (
              <CheckCircle2 size={14} />
            ) : (
              <ArrowDownToLine size={14} />
            )}
            {isSubmitting ? "Registrando…" : submitStatus === "success" ? "Registrado" : "Confirmar aportación"}
          </button>
        </div>
      </div>
    </div>
  );
}
