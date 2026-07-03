"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useCryptoStore } from "@/stores/crypto-store";
import { loadCryptoData } from "@/app/actions/crypto";

type Status = "idle" | "loading" | "success" | "error";

export function SyncBit2MeButton({ compact = false }: { compact?: boolean }) {
  const setAssets = useCryptoStore((s) => s.setAssets);
  const setTransactions = useCryptoStore((s) => s.setTransactions);
  const setDefiPositions = useCryptoStore((s) => s.setDefiPositions);
  const setMonthlyPlan = useCryptoStore((s) => s.setMonthlyPlan);

  const [status, setStatus] = useState<Status>("idle");
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSync() {
    setStatus("loading");
    setSyncedCount(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/bit2me/sync", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const json = (await res.json()) as { synced: number; skipped: number; total: number };
      setSyncedCount(json.synced);

      const data = await loadCryptoData();
      if (data) {
        setAssets(data.assets);
        setTransactions(data.transactions);
        setDefiPositions(data.defiPositions);
        setMonthlyPlan(data.monthlyPlan);
      }

      setStatus("success");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setStatus("error");
      setTimeout(() => { setStatus("idle"); setErrorMsg(null); }, 6000);
    }
  }

  const isLoading = status === "loading";

  const btnStyle: React.CSSProperties =
    status === "success"
      ? {
          backgroundColor: "rgba(46,125,107,0.10)",
          color: "var(--platform-patrimonio, var(--color-gain))",
          border: "1px solid rgba(46,125,107,0.20)",
        }
      : status === "error"
        ? {
            backgroundColor: "rgba(163,45,45,0.10)",
            color: "var(--color-loss)",
            border: "1px solid rgba(163,45,45,0.20)",
          }
        : {
            backgroundColor: "color-mix(in srgb, var(--platform-crypto) 10%, transparent)",
            color: "var(--platform-crypto)",
            border: "1px solid color-mix(in srgb, var(--platform-crypto) 20%, transparent)",
          };

  const label =
    status === "loading"
      ? "Sincronizando…"
      : status === "success"
        ? syncedCount === 0
          ? "Al día"
          : `+${syncedCount} importadas`
        : status === "error"
          ? "Error al sincronizar"
          : compact
            ? "Sync Bit2Me"
            : "Sincronizar Bit2Me";

  const icon =
    status === "success" ? (
      <CheckCircle2 size={compact ? 13 : 14} strokeWidth={2} aria-hidden="true" />
    ) : status === "error" ? (
      <AlertCircle size={compact ? 13 : 14} strokeWidth={2} aria-hidden="true" />
    ) : (
      <RefreshCw
        size={compact ? 13 : 14}
        strokeWidth={2}
        aria-hidden="true"
        className={isLoading ? "animate-spin" : ""}
      />
    );

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={isLoading}
        className={`flex items-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
        style={btnStyle}
        aria-label="Sincronizar transacciones desde Bit2Me"
      >
        {icon}
        {label}
      </button>
      {errorMsg && (
        <p className="font-mono text-xs max-w-48 text-right" style={{ color: "var(--color-loss)" }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
