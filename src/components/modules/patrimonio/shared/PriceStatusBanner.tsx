"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, EyeOff, Eye, CalendarClock } from "lucide-react";
import { usePatrimonioPrices } from "@/lib/hooks/use-patrimonio-prices";
import { useToast } from "@/stores/ui-store";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

const formatDateTime = (date: Date) =>
  date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const COOLDOWN_S = 60;

export function PriceStatusBanner() {
  const { lastUpdated, refreshPrices, isRefreshing } = usePatrimonioPrices();
  const toast = useToast();
  const router = useRouter();
  const privacyMode = usePatrimonioStore((s) => s.privacyMode);
  const togglePrivacyMode = usePatrimonioStore((s) => s.togglePrivacyMode);

  const [cooldown, setCooldown] = useState(0);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCounting = cooldown > 0;

  // Tick down once per second while countdown is active
  useEffect(() => {
    if (!isCounting) return;
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
  }, [isCounting]);

  const handleRefresh = useCallback(async () => {
    if (cooldown > 0 || isRefreshing) return;
    setCooldown(COOLDOWN_S);
    try {
      await refreshPrices();
      toast.success("Precios actualizados correctamente");
    } catch {
      toast.error("Error al actualizar precios");
    }
  }, [cooldown, isRefreshing, refreshPrices, toast]);

  const handleLoadHistorical = useCallback(async () => {
    if (isLoadingHistorical) return;
    setIsLoadingHistorical(true);
    try {
      const res = await fetch("/api/patrimonio/prices/historical", { method: "POST" });
      const json = (await res.json()) as {
        assets_processed?: number;
        prices_inserted?: number;
        snapshots_regenerated?: boolean;
        snapshots_count?: number;
        snapshots_with_pl?: number;
        errors?: string[];
        error?: string;
      };
      if (!res.ok || json.error) {
        toast.error(`Error: ${json.error ?? "Error al cargar histórico"}`);
        return;
      }
      if (json.errors && json.errors.length > 0) {
        toast.error(`Errores: ${json.errors.slice(0, 2).join(" | ")}`);
        return;
      }
      toast.success(
        `Histórico cargado: ${json.prices_inserted ?? 0} precios · ${json.snapshots_with_pl ?? 0}/${json.snapshots_count ?? 0} snapshots con P&L`
      );
      // Recarga completa para garantizar que los Server Components devuelven datos frescos
      window.location.reload();
    } catch {
      toast.error("Error al cargar histórico de precios");
    } finally {
      setIsLoadingHistorical(false);
    }
  }, [isLoadingHistorical, router, toast]);

  const btnDisabled = isRefreshing || cooldown > 0;
  const btnLabel = isRefreshing
    ? "Actualizando..."
    : cooldown > 0
    ? `Actualizar en ${cooldown}s`
    : lastUpdated
    ? "Actualizar"
    : "Obtener precios";

  const privacyBtn = (
    <button
      type="button"
      onClick={togglePrivacyMode}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        backgroundColor: privacyMode ? "rgba(91,140,106,0.12)" : "transparent",
        color: privacyMode ? "var(--module-patrimonio)" : "var(--text-tertiary)",
        border: `1px solid ${privacyMode ? "rgba(91,140,106,0.3)" : "var(--border)"}`,
      }}
      aria-label={privacyMode ? "Mostrar cifras" : "Ocultar cifras"}
      title={privacyMode ? "Mostrar cifras" : "Modo privacidad: ocultar cifras"}
    >
      {privacyMode ? <Eye size={11} strokeWidth={2} aria-hidden="true" /> : <EyeOff size={11} strokeWidth={2} aria-hidden="true" />}
      {privacyMode ? "Mostrar" : "Privacidad"}
    </button>
  );

  const refreshBtn = (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={btnDisabled}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        backgroundColor: btnDisabled ? "transparent" : "rgba(46,125,107,0.10)",
        color: btnDisabled ? "var(--text-tertiary)" : "var(--module-patrimonio)",
        border: `1px solid ${btnDisabled ? "var(--border)" : "rgba(46,125,107,0.25)"}`,
        cursor: btnDisabled ? "not-allowed" : "pointer",
      }}
      aria-label={btnLabel}
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

  const historicalBtn = (
    <button
      type="button"
      onClick={handleLoadHistorical}
      disabled={isLoadingHistorical}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        backgroundColor: isLoadingHistorical ? "transparent" : "rgba(155,122,74,0.10)",
        color: isLoadingHistorical ? "var(--text-tertiary)" : "var(--module-mercados)",
        border: `1px solid ${isLoadingHistorical ? "var(--border)" : "rgba(155,122,74,0.25)"}`,
        cursor: isLoadingHistorical ? "not-allowed" : "pointer",
      }}
      title="Cargar precios históricos mensuales (Nov 2024 → hoy) y regenerar snapshots"
      aria-label="Cargar histórico de precios"
    >
      <CalendarClock
        size={11}
        strokeWidth={2}
        className={isLoadingHistorical ? "animate-pulse" : ""}
        aria-hidden="true"
      />
      {isLoadingHistorical ? "Cargando..." : "Cargar histórico"}
    </button>
  );

  // No prices yet in DB
  if (!lastUpdated) {
    return (
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs"
        style={{ backgroundColor: "var(--bg-sand)", border: "1px solid var(--border)" }}
      >
        <span className="text-text-tertiary">Sin precios</span>
        <div className="ml-auto flex items-center gap-2">{privacyBtn}{historicalBtn}{refreshBtn}</div>
      </div>
    );
  }

  // Prices available — show date of last update
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs"
      style={{
        backgroundColor: "rgba(136,135,128,0.06)",
        border: "1px solid rgba(136,135,128,0.18)",
        borderLeftWidth: 2,
        borderLeftColor: "#888780",
      }}
    >
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: "#888780" }}
        aria-hidden="true"
      />
      <span className="text-text-secondary font-medium">
        Precios del {formatDateTime(lastUpdated)}
      </span>
      <div className="ml-auto flex items-center gap-2">{privacyBtn}{historicalBtn}{refreshBtn}</div>
    </div>
  );
}
