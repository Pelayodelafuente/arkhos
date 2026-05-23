"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UniversalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickAction {
  label: string;
  description?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Ver Trade Republic", description: "Acciones y ETFs" },
  { label: "Ver Indexa Capital", description: "Fondos indexados" },
  { label: "Ver Horos", description: "Fondo activo" },
  { label: "Ver Mintos", description: "P2P lending" },
  { label: "Ver Crypto", description: "Criptomonedas" },
  { label: "Ir a Fiscalidad", description: "FIFO y plusvalías" },
];

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// ── Main component ─────────────────────────────────────────────────────────────

export function UniversalSearch({ isOpen, onClose }: UniversalSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const assets = usePatrimonioStore((s) => s.assets);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM is painted
      const id = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(id);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Asset search
  const filteredAssets = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return assets
      .filter((a) => {
        const name = (a.name ?? "").toLowerCase();
        const ticker = (a.ticker ?? "").toLowerCase();
        const isin = (a.isin ?? "").toLowerCase();
        return name.includes(q) || ticker.includes(q) || isin.includes(q);
      })
      .slice(0, 5);
  }, [assets, query]);

  // Quick actions filter
  const filteredActions = useMemo(() => {
    if (!query.trim()) return QUICK_ACTIONS;
    const q = query.toLowerCase();
    return QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q));
  }, [query]);

  if (!isOpen) return null;

  const hasResults = filteredAssets.length > 0 || filteredActions.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Busqueda global"
    >
      <div
        className="w-full max-w-xl mx-4 rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        // Prevent click from bubbling to overlay
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="flex-shrink-0"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
              stroke="var(--text-tertiary, var(--text-muted))"
              strokeWidth="1.75"
            />
            <path
              d="M21 21l-4.35-4.35"
              stroke="var(--text-tertiary, var(--text-muted))"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar activos, plataformas..."
            className="w-full bg-transparent text-base outline-none"
            style={{ color: "var(--text-primary)" }}
            aria-label="Buscar en el patrimonio"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="flex-shrink-0"
              aria-label="Limpiar busqueda"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="var(--text-tertiary, var(--text-muted))"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Separator */}
        <hr style={{ borderColor: "var(--border-stone, rgba(160,120,80,0.2))" }} />

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {!hasResults && query.trim() && (
            <p
              className="px-4 py-6 text-center text-sm"
              style={{ color: "var(--text-tertiary, var(--text-muted))" }}
            >
              Sin resultados para &ldquo;{query}&rdquo;
            </p>
          )}

          {/* Assets section */}
          {filteredAssets.length > 0 && (
            <div>
              <p
                className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary, var(--text-muted))" }}
              >
                Activos
              </p>
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={onClose}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-100"
                  style={{}}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "var(--bg-surface, var(--bg-elevated))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "";
                  }}
                >
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {asset.name}
                    </p>
                    {asset.ticker && (
                      <p
                        className="font-mono text-xs"
                        style={{ color: "var(--text-tertiary, var(--text-muted))" }}
                      >
                        {asset.ticker}
                        {asset.isin ? ` · ${asset.isin}` : ""}
                      </p>
                    )}
                  </div>
                  {asset.current_value != null && (
                    <span
                      className="font-mono text-sm font-medium flex-shrink-0"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {formatEur(asset.current_value)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Quick actions section */}
          {filteredActions.length > 0 && (
            <div>
              <p
                className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary, var(--text-muted))" }}
              >
                Acciones rapidas
              </p>
              {filteredActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={onClose}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "var(--bg-surface, var(--bg-elevated))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "";
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="flex-shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12h14M12 5l7 7-7 7"
                      stroke="var(--text-tertiary, var(--text-muted))"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div>
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {action.label}
                    </p>
                    {action.description && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary, var(--text-muted))" }}
                      >
                        {action.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2.5"
          style={{ borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}
        >
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary, var(--text-muted))" }}
          >
            ↵ seleccionar · ↑↓ navegar · Esc cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
