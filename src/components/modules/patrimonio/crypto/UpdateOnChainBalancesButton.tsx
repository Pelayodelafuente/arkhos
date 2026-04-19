"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useCryptoStore } from "@/stores/crypto-store";
import { loadCryptoData } from "@/app/actions/crypto";

type Status = "idle" | "loading" | "success" | "error";

export function UpdateOnChainBalancesButton() {
  const setAssets = useCryptoStore((s) => s.setAssets);
  const setTransactions = useCryptoStore((s) => s.setTransactions);
  const setDefiPositions = useCryptoStore((s) => s.setDefiPositions);
  const setMonthlyPlan = useCryptoStore((s) => s.setMonthlyPlan);

  const [status, setStatus] = useState<Status>("idle");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function handleUpdate() {
    setStatus("loading");
    try {
      const res = await fetch("/api/crypto/prices", { method: "POST" });
      if (!res.ok) throw new Error("API error");

      const data = await loadCryptoData();
      if (data) {
        setAssets(data.assets);
        setTransactions(data.transactions);
        setDefiPositions(data.defiPositions);
        setMonthlyPlan(data.monthlyPlan);
      }

      setLastUpdated(new Date());
      setStatus("success");

      // Reset to idle after 3s
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  const isLoading = status === "loading";

  const btnStyle: React.CSSProperties =
    status === "success"
      ? {
          backgroundColor: "rgba(46,125,107,0.10)",
          color: "var(--platform-patrimonio, #2E7D6B)",
          border: "1px solid rgba(46,125,107,0.20)",
        }
      : status === "error"
        ? {
            backgroundColor: "rgba(163,45,45,0.10)",
            color: "#A32D2D",
            border: "1px solid rgba(163,45,45,0.20)",
          }
        : {
            backgroundColor: "color-mix(in srgb, var(--platform-crypto) 10%, transparent)",
            color: "var(--platform-crypto)",
            border: "1px solid color-mix(in srgb, var(--platform-crypto) 20%, transparent)",
          };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleUpdate}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 disabled:opacity-50"
        style={btnStyle}
        aria-label="Actualizar saldos on-chain y precios crypto"
      >
        {status === "success" ? (
          <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
        ) : status === "error" ? (
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
        ) : (
          <RefreshCw
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className={isLoading ? "animate-spin" : ""}
          />
        )}
        {status === "loading"
          ? "Actualizando…"
          : status === "success"
            ? "Actualizado"
            : status === "error"
              ? "Error al actualizar"
              : "Actualizar saldos on-chain"}
      </button>

      {lastUpdated && (
        <p className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          Ultima actualización:{" "}
          {lastUpdated.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
