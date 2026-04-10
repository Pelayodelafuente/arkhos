"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { usePatrimonioPrices } from "@/lib/hooks/use-patrimonio-prices";

const formatTime = (date: Date) =>
  date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

const formatDateTime = (date: Date) =>
  date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function isMarketOpen(mkt: { eu: string; us: string; hk: string } | null): boolean {
  if (!mkt) return false;
  return mkt.eu === "open" || mkt.us === "open" || mkt.hk === "open";
}

const COOLDOWN_S = 60;

export function PriceStatusBanner() {
  const { status, lastUpdated, forex, marketStatus, errors, refreshPrices, isRefreshing } =
    usePatrimonioPrices();

  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start cooldown countdown after each refresh
  useEffect(() => {
    if (!isRefreshing) return;
    setCooldown(COOLDOWN_S);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRefreshing]);

  const handleRefresh = useCallback(async () => {
    if (cooldown > 0 || isRefreshing) return;
    await refreshPrices();
  }, [cooldown, isRefreshing, refreshPrices]);

  // Don't render while first checking
  if (status === "idle" || status === "checking") {
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-tertiary"
        style={{ backgroundColor: "var(--bg-sand)", border: "1px solid var(--border)" }}>
        <svg className="h-3 w-3 animate-spin text-text-tertiary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Obteniendo precios...
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-tertiary"
        style={{ backgroundColor: "var(--bg-sand)", border: "1px solid var(--border)" }}>
        <svg className="h-3 w-3 animate-spin text-text-tertiary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Actualizando precios...
      </div>
    );
  }

  const marketOpen = isMarketOpen(marketStatus);
  const fxLabel = forex?.usdToEur ? `USD/EUR: ${forex.usdToEur.toFixed(4)}` : null;

  // Button label
  const btnLabel = isRefreshing
    ? "Actualizando..."
    : cooldown > 0
    ? `Actualizar en ${cooldown}s`
    : "Actualizar";

  const btnDisabled = isRefreshing || cooldown > 0;

  const refreshBtn = (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={btnDisabled}
      className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        backgroundColor: btnDisabled ? "transparent" : "rgba(46,125,107,0.10)",
        color: btnDisabled ? "var(--text-tertiary)" : "var(--module-patrimonio)",
        border: `1px solid ${btnDisabled ? "var(--border)" : "rgba(46,125,107,0.25)"}`,
        cursor: btnDisabled ? "not-allowed" : "pointer",
      }}
      aria-label="Actualizar precios"
    >
      <RefreshCw
        size={11}
        strokeWidth={2}
        className={isRefreshing ? "animate-spin" : ""}
        aria-hidden="true"
      />
      {btnLabel}
    </button>
  );

  // STATUS: offline
  if (status === "offline") {
    return (
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs"
        style={{
          backgroundColor: "rgba(163,45,45,0.06)",
          border: "1px solid rgba(163,45,45,0.18)",
          borderLeftWidth: 2,
          borderLeftColor: "#A32D2D",
        }}
      >
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: "#A32D2D" }}
          aria-hidden="true"
        />
        <span className="text-text-secondary font-medium">Sin conexión</span>
        <span className="text-text-tertiary">Usando precios de base de datos</span>
        {errors.length > 0 && (
          <span className="text-text-tertiary">· {errors[0]}</span>
        )}
        {refreshBtn}
      </div>
    );
  }

  // STATUS: partial
  if (status === "partial") {
    return (
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs"
        style={{
          backgroundColor: "rgba(176,122,58,0.06)",
          border: "1px solid rgba(176,122,58,0.18)",
          borderLeftWidth: 2,
          borderLeftColor: "#B07A3A",
        }}
      >
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: "#B07A3A" }}
          aria-hidden="true"
        />
        <span className="text-text-secondary font-medium">Precios parciales</span>
        {lastUpdated && (
          <span className="text-text-tertiary">· {formatTime(lastUpdated)}</span>
        )}
        {errors.length > 0 && (
          <span className="text-text-tertiary">· {errors[0]}</span>
        )}
        {refreshBtn}
      </div>
    );
  }

  // STATUS: live
  if (lastUpdated) {
    const label = marketOpen
      ? `En vivo · ${formatTime(lastUpdated)}`
      : `Precios del cierre · ${formatDateTime(lastUpdated)}`;

    return (
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs"
        style={{
          backgroundColor: marketOpen ? "rgba(46,125,107,0.06)" : "rgba(136,135,128,0.06)",
          border: `1px solid ${marketOpen ? "rgba(46,125,107,0.18)" : "rgba(136,135,128,0.18)"}`,
          borderLeftWidth: 2,
          borderLeftColor: marketOpen ? "#2E7D6B" : "#888780",
        }}
      >
        <span
          className={`h-2 w-2 flex-shrink-0 rounded-full ${marketOpen ? "live-dot" : ""}`}
          style={{ backgroundColor: marketOpen ? "#2E7D6B" : "#888780" }}
          aria-hidden="true"
        />
        <span className="text-text-secondary font-medium">{label}</span>
        {fxLabel && <span className="text-text-tertiary">· {fxLabel}</span>}
        {marketStatus && (
          <span className="text-text-tertiary">
            · EU: {marketStatus.eu === "open" ? "abierto" : "cerrado"}
            {" · "}US: {marketStatus.us === "open" ? "abierto" : "cerrado"}
          </span>
        )}
        {refreshBtn}
      </div>
    );
  }

  return null;
}
