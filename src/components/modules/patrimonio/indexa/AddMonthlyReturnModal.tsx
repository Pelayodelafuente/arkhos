"use client";

import { useState, useMemo } from "react";
import { X, PlusCircle, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useIndexaStore } from "@/stores/indexa-store";
import { addIndexaMonthlyReturn } from "@/app/actions/indexa";

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface AddMonthlyReturnModalProps {
  onClose: () => void;
}

export function AddMonthlyReturnModal({ onClose }: AddMonthlyReturnModalProps) {
  const monthlyReturns = useIndexaStore((s) => s.monthlyReturns);
  const setMonthlyReturns = useIndexaStore((s) => s.setMonthlyReturns);
  const setOverview = useIndexaStore((s) => s.setOverview);

  // Default to the month after the last recorded one
  const defaultYearMonth = useMemo(() => {
    if (monthlyReturns.length === 0) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    const last = [...monthlyReturns].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    )[monthlyReturns.length - 1];
    const nextMonth = last.month === 12 ? 1 : last.month + 1;
    const nextYear = last.month === 12 ? last.year + 1 : last.year;
    return { year: nextYear, month: nextMonth };
  }, [monthlyReturns]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 1 }, (_, i) => 2025 + i);

  const [year, setYear] = useState(defaultYearMonth.year);
  const [month, setMonth] = useState(defaultYearMonth.month);
  const [returnPct, setReturnPct] = useState("");
  const [benchmarkPct, setBenchmarkPct] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Find if this month already exists (editing)
  const existingReturn = monthlyReturns.find((r) => r.year === year && r.month === month);

  // Live preview of new cumulative TWR
  const previewCumulative = useMemo(() => {
    const ret = parseFloat(returnPct.replace(",", "."));
    if (isNaN(ret)) return null;

    // Find the most recent return before the selected month
    const sorted = [...monthlyReturns]
      .filter((r) => r.year < year || (r.year === year && r.month < month))
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

    if (sorted.length === 0) return ret;
    const prevCum = sorted[sorted.length - 1].cumulative_twr ?? 0;
    return parseFloat(((1 + prevCum / 100) * (1 + ret / 100) * 100 - 100).toFixed(2));
  }, [returnPct, year, month, monthlyReturns]);

  const returnValue = parseFloat(returnPct.replace(",", "."));
  const hasValidInput = !isNaN(returnValue) && returnPct.trim() !== "";

  async function handleSubmit() {
    if (!hasValidInput) return;
    setStatus("loading");
    setErrorMsg(null);

    const benchmarkValue = benchmarkPct.trim()
      ? parseFloat(benchmarkPct.replace(",", "."))
      : null;

    const result = await addIndexaMonthlyReturn({
      year,
      month,
      returnPct: returnValue,
      benchmarkPct: isNaN(benchmarkValue ?? NaN) ? null : benchmarkValue,
    });

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error ?? "Error desconocido");
      setTimeout(() => setStatus("idle"), 4000);
      return;
    }

    // Update store with the fresh data returned by the action
    if (result.data) {
      setMonthlyReturns(result.data.monthlyReturns);
      setOverview(result.data.overview);
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
      aria-labelledby="add-return-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="add-return-title" className="font-heading text-lg text-foreground">
              {existingReturn ? "Editar rentabilidad" : "Añadir rentabilidad mensual"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Introduce el % mensual publicado por Indexa Capital al cierre del mes.
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

        {/* Form */}
        <div className="space-y-4">
          {/* Year + Month row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Año</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  backgroundColor: "var(--bg-sand)",
                  border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                  color: "var(--text-primary)",
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Mes</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  backgroundColor: "var(--bg-sand)",
                  border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                  color: "var(--text-primary)",
                }}
              >
                {MONTH_FULL.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {existingReturn && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                backgroundColor: "rgba(59,120,176,0.08)",
                color: "#3B78B0",
                border: "1px solid rgba(59,120,176,0.15)",
              }}
            >
              Ya tienes {MONTH_NAMES[month - 1]} {year} registrado ({existingReturn.return_pct !== null ? `${existingReturn.return_pct >= 0 ? "+" : ""}${existingReturn.return_pct.toFixed(1)}%` : "—"}). Guardar sobreescribirá el valor.
            </div>
          )}

          {/* Return % */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Rentabilidad del mes (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={returnPct}
              onChange={(e) => setReturnPct(e.target.value)}
              placeholder="Ej: 6.90 o -5.30"
              className="w-full rounded-lg px-3 py-2 font-mono text-sm transition-colors"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
              autoFocus
            />
          </div>

          {/* Benchmark % (optional) */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Benchmark Inverco (%) — opcional
            </label>
            <input
              type="number"
              step="0.01"
              value={benchmarkPct}
              onChange={(e) => setBenchmarkPct(e.target.value)}
              placeholder="Ej: 0.80"
              className="w-full rounded-lg px-3 py-2 font-mono text-sm transition-colors"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Preview */}
          {hasValidInput && previewCumulative !== null && (
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2.5"
              style={{
                backgroundColor: "var(--bg-sand)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.15))",
              }}
            >
              <span className="text-xs text-muted-foreground">TWR acumulada resultante</span>
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: previewCumulative >= 0 ? "var(--platform-tr, #2E7D6B)" : "#A32D2D" }}
              >
                {previewCumulative >= 0 ? "+" : ""}{previewCumulative.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {status === "error" && errorMsg && (
          <div
            className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs"
            style={{
              backgroundColor: "rgba(163,45,45,0.08)",
              color: "#A32D2D",
              border: "1px solid rgba(163,45,45,0.15)",
            }}
          >
            <AlertCircle size={14} />
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
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
            disabled={!hasValidInput || status === "loading" || status === "success"}
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
              <PlusCircle size={14} />
            )}
            {status === "loading" ? "Guardando…" : status === "success" ? "Guardado" : (existingReturn ? "Actualizar" : "Guardar")}
          </button>
        </div>
      </div>
    </div>
  );
}
