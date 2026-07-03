"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { registerHorosContribution } from "@/app/actions/horos";
import { useHorosStore } from "@/stores/horos-store";

const HOROS_COLOR = "var(--module-mercados)";

const fmtShares = (v: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(v);

interface RegisterHorosContributionModalProps {
  defaultAmount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegisterHorosContributionModal({
  defaultAmount = 100,
  onClose,
  onSuccess,
}: RegisterHorosContributionModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [requestDate, setRequestDate] = useState(today);
  const [valueDate, setValueDate] = useState(today);
  const [navApplied, setNavApplied] = useState("");
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPosition = useHorosStore((s) => s.setPosition);
  const setTransactions = useHorosStore((s) => s.setTransactions);
  const setNavHistory = useHorosStore((s) => s.setNavHistory);

  const parsedNav = parseFloat(navApplied.replace(",", "."));
  const parsedAmount = parseFloat(amount.replace(",", "."));
  const sharesObtained =
    !isNaN(parsedNav) && parsedNav > 0 && !isNaN(parsedAmount)
      ? fmtShares(parsedAmount / parsedNav)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isNaN(parsedNav) || parsedNav <= 0) {
      setError("Introduce un VL válido");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Introduce un importe válido");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await registerHorosContribution({
      requestDate,
      valueDate,
      navApplied: parsedNav,
      amount: parsedAmount,
      notes: notes.trim() || undefined,
    });

    if (!result.ok) {
      setError(result.error ?? "Error al registrar");
      setLoading(false);
      return;
    }
    // Update store with the fresh data returned by the action
    if (result.data) {
      setPosition(result.data.position);
      setTransactions(result.data.transactions);
      setNavHistory(result.data.navHistory);
    }
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          backgroundColor: "var(--bg-page)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-heading text-lg text-foreground">Registrar aportación</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Horos Value Internacional, FI
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-stone-100"
            style={{ color: "var(--text-muted)" }}
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Fecha solicitud
              </label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 font-mono text-sm outline-none"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                  color: "var(--text-primary)",
                }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Fecha valor
              </label>
              <input
                type="date"
                value={valueDate}
                onChange={(e) => setValueDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 font-mono text-sm outline-none"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                  color: "var(--text-primary)",
                }}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Importe (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-mono text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
              placeholder="100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              VL aplicado (€/participación)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={navApplied}
              onChange={(e) => setNavApplied(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-mono text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
              placeholder="215.006"
              required
            />
          </div>

          {sharesObtained && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs font-mono"
              style={{ backgroundColor: `color-mix(in srgb, ${HOROS_COLOR} 8%, transparent)` }}
            >
              <span style={{ color: "var(--text-muted)" }}>Participaciones obtenidas: </span>
              <strong style={{ color: HOROS_COLOR }}>{sharesObtained}</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Notas (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
              placeholder="Aportación mensual"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg px-4 py-2 text-sm transition-colors hover:bg-stone-100"
              style={{ color: "var(--text-secondary)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: HOROS_COLOR }}
            >
              <Plus size={13} />
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
