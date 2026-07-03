"use client";

import { useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { updateHorosNAV } from "@/app/actions/horos";
import { useHorosStore } from "@/stores/horos-store";

const HOROS_COLOR = "var(--module-mercados)";

const fmtNav = (v: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);

interface UpdateNAVModalProps {
  currentNav: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateNAVModal({ currentNav, onClose, onSuccess }: UpdateNAVModalProps) {
  const [navPrice, setNavPrice] = useState(currentNav.toString());
  const [navDate, setNavDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPosition = useHorosStore((s) => s.setPosition);
  const setNavHistory = useHorosStore((s) => s.setNavHistory);
  const position = useHorosStore((s) => s.position);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nav = parseFloat(navPrice.replace(",", "."));
    if (isNaN(nav) || nav <= 0) {
      setError("Introduce un VL válido");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updateHorosNAV({ navPrice: nav, navDate });
    if (!result.ok) {
      setError(result.error ?? "Error al actualizar");
      setLoading(false);
      return;
    }
    // Update store with the fresh data returned by the action (position + NAV history)
    if (result.data) {
      setPosition(result.data.position);
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
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-heading text-lg text-foreground">Actualizar VL</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              VL actual: {fmtNav(currentNav)}€
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
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Nuevo VL (€/participación)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={navPrice}
              onChange={(e) => setNavPrice(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-mono text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
              placeholder="215.006"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Fecha del VL
            </label>
            <input
              type="date"
              value={navDate}
              onChange={(e) => setNavDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-mono text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                color: "var(--text-primary)",
              }}
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {navPrice && position && !isNaN(parseFloat(navPrice.replace(",", "."))) && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs font-mono"
              style={{ backgroundColor: `color-mix(in srgb, ${HOROS_COLOR} 8%, transparent)` }}
            >
              <span style={{ color: "var(--text-muted)" }}>Nuevo valor: </span>
              <strong style={{ color: HOROS_COLOR }}>
                {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
                  position.shares * parseFloat(navPrice.replace(",", "."))
                )}
              </strong>
            </div>
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
              {loading && <RefreshCw size={13} className="animate-spin" />}
              Actualizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
