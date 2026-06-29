"use client";

import { useState } from "react";
import { X, RefreshCw, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useIndexaStore } from "@/stores/indexa-store";
import { updateIndexaPrices, loadIndexaData } from "@/app/actions/indexa";
import type { IndexaPosition } from "@/types/indexa";

import { formatEur } from "@/lib/utils/format";

const formatNum = (v: number, decimals = 4) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);

interface PriceInputRowProps {
  position: IndexaPosition;
  value: string;
  onChange: (v: string) => void;
}

function PriceInputRow({ position, value, onChange }: PriceInputRowProps) {
  const fundName = position.fund?.name ?? "Fondo desconocido";
  const fundType = position.fund?.fund_type ?? "equity";
  const color = position.fund?.color ?? "#3B78B0";
  const isin = position.fund?.isin ?? "";
  const currentPrice = position.price_per_share ?? 0;
  const shares = position.shares ?? 0;

  const newPrice = parseFloat(value.replace(",", ".")) || 0;
  const newValue = shares * newPrice;
  const newGain = newValue - position.total_cost;
  const newGainPct = position.total_cost > 0 ? (newGain / position.total_cost) * 100 : 0;
  const hasValidInput = newPrice > 0;

  const TYPE_LABEL: Record<string, string> = { equity: "Acciones", bond: "Bonos", cash: "Liquidez" };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: "var(--bg-sand)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.20))",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-foreground truncate">{fundName}</p>
            <span
              className="rounded px-1.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${color}18`, color }}
            >
              {TYPE_LABEL[fundType] ?? fundType}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{isin}</p>
        </div>
      </div>

      {/* Current stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Participaciones</p>
          <p className="font-mono font-medium text-foreground">{formatNum(shares, 2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Precio actual</p>
          <p className="font-mono font-medium text-foreground">{formatNum(currentPrice, 4)}€</p>
        </div>
        <div>
          <p className="text-muted-foreground">Coste total</p>
          <p className="font-mono font-medium text-foreground">{formatEur(position.total_cost)}</p>
        </div>
      </div>

      {/* Price input */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Nuevo precio por participación (€)
        </label>
        <input
          type="number"
          step="0.0001"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Ej: ${formatNum(currentPrice, 4)}`}
          className="w-full rounded-lg px-3 py-2 font-mono text-sm transition-colors"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
      </div>

      {/* Preview */}
      {hasValidInput && (
        <div
          className="flex items-center justify-between gap-4 rounded-lg px-3 py-2"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}
        >
          <div>
            <p className="text-xs text-muted-foreground">Nuevo valor</p>
            <p className="font-mono text-sm font-semibold text-foreground">{formatEur(newValue)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {newGain >= 0
              ? <TrendingUp size={13} style={{ color: "var(--platform-tr, #2E7D6B)" }} />
              : <TrendingDown size={13} style={{ color: "#A32D2D" }} />}
            <div>
              <p className="text-xs text-muted-foreground">P&L</p>
              <p
                className="font-mono text-sm font-semibold"
                style={{ color: newGain >= 0 ? "var(--platform-tr, #2E7D6B)" : "#A32D2D" }}
              >
                {newGain >= 0 ? "+" : ""}{formatEur(newGain)} ({newGainPct >= 0 ? "+" : ""}{newGainPct.toFixed(2)}%)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface UpdateIndexaPricesModalProps {
  onClose: () => void;
}

export function UpdateIndexaPricesModal({ onClose }: UpdateIndexaPricesModalProps) {
  const positions = useIndexaStore((s) => s.positions);
  const setOverview = useIndexaStore((s) => s.setOverview);
  const setPositions = useIndexaStore((s) => s.setPositions);
  const setFunds = useIndexaStore((s) => s.setFunds);
  const setTransactions = useIndexaStore((s) => s.setTransactions);
  const setMonthlyReturns = useIndexaStore((s) => s.setMonthlyReturns);
  const setPlan = useIndexaStore((s) => s.setPlan);

  const fundPositions = positions.filter(
    (p) => p.fund_type !== "cash" && p.shares !== null && (p.shares ?? 0) > 0
  );

  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(fundPositions.map((p) => [p.id, ""]))
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasAnyInput = Object.values(prices).some((v) => parseFloat(v.replace(",", ".")) > 0);

  async function handleSubmit() {
    const updates = fundPositions
      .map((p) => {
        const raw = prices[p.id] ?? "";
        const price = parseFloat(raw.replace(",", "."));
        if (!price || price <= 0) return null;
        return {
          positionId: p.id,
          pricePerShare: price,
          shares: p.shares ?? 0,
          totalCost: p.total_cost,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    if (updates.length === 0) return;

    setStatus("loading");
    setErrorMsg(null);

    const result = await updateIndexaPrices(updates);
    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error ?? "Error desconocido");
      setTimeout(() => setStatus("idle"), 4000);
      return;
    }

    // Reload fresh data into store
    const fresh = await loadIndexaData();
    if (fresh) {
      setFunds(fresh.funds);
      setPositions(fresh.positions);
      setTransactions(fresh.transactions);
      setMonthlyReturns(fresh.monthlyReturns);
      setPlan(fresh.plan);
      setOverview(fresh.overview);
    }

    setStatus("success");
    setTimeout(onClose, 1200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-prices-title"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="update-prices-title" className="font-heading text-lg text-foreground">
              Actualizar precios Indexa
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Introduce el precio por participación desde tu portal de Indexa Capital. El NAV se publica diariamente tras el cierre de mercado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-card"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Fund rows */}
        <div className="space-y-4 mb-6">
          {fundPositions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay posiciones de fondos para actualizar.
            </p>
          ) : (
            fundPositions.map((pos) => (
              <PriceInputRow
                key={pos.id}
                position={pos}
                value={prices[pos.id] ?? ""}
                onChange={(v) => setPrices((prev) => ({ ...prev, [pos.id]: v }))}
              />
            ))
          )}
        </div>

        {/* Error */}
        {status === "error" && errorMsg && (
          <div
            className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs"
            style={{ backgroundColor: "rgba(163,45,45,0.08)", color: "#A32D2D", border: "1px solid rgba(163,45,45,0.15)" }}
          >
            <AlertCircle size={14} />
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
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
            disabled={!hasAnyInput || status === "loading" || status === "success"}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: status === "success"
                ? "rgba(46,125,107,0.12)"
                : "rgba(59,120,176,0.12)",
              color: status === "success" ? "var(--platform-tr, #2E7D6B)" : "#3B78B0",
              border: status === "success"
                ? "1px solid rgba(46,125,107,0.25)"
                : "1px solid rgba(59,120,176,0.25)",
            }}
          >
            {status === "loading" ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : status === "success" ? (
              <CheckCircle2 size={14} />
            ) : (
              <RefreshCw size={14} />
            )}
            {status === "loading" ? "Guardando…" : status === "success" ? "Actualizado" : "Actualizar precios"}
          </button>
        </div>
      </div>
    </div>
  );
}
