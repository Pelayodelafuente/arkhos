"use client";

import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";
import type { CryptoTransactionType } from "@/types/crypto";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const formatPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

const TX_TYPE_LABELS: Record<CryptoTransactionType, string> = {
  buy: "Compra",
  sell: "Venta",
  transfer_in: "Entrada",
  transfer_out: "Salida",
  staking_reward: "Staking",
  defi_yield: "DeFi Yield",
};

const TX_TYPE_COLORS: Record<CryptoTransactionType, { bg: string; color: string; border: string }> = {
  buy: {
    bg: "rgba(46,125,107,0.10)",
    color: "var(--platform-patrimonio, #2E7D6B)",
    border: "1px solid rgba(46,125,107,0.20)",
  },
  sell: {
    bg: "rgba(163,45,45,0.10)",
    color: "#A32D2D",
    border: "1px solid rgba(163,45,45,0.20)",
  },
  transfer_in: {
    bg: "rgba(98,126,234,0.10)",
    color: "#627EEA",
    border: "1px solid rgba(98,126,234,0.20)",
  },
  transfer_out: {
    bg: "rgba(141,141,141,0.10)",
    color: "#8D8D8D",
    border: "1px solid rgba(141,141,141,0.20)",
  },
  staking_reward: {
    bg: "rgba(176,122,58,0.10)",
    color: "var(--platform-crypto)",
    border: "1px solid rgba(176,122,58,0.20)",
  },
  defi_yield: {
    bg: "rgba(46,125,107,0.10)",
    color: "var(--platform-patrimonio, #2E7D6B)",
    border: "1px solid rgba(46,125,107,0.20)",
  },
};

type ActiveFilter = "all" | "BTC" | "ETH" | "USDC";

const FILTERS: { id: ActiveFilter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "BTC", label: "BTC" },
  { id: "ETH", label: "ETH" },
  { id: "USDC", label: "USDC" },
];

export function CryptoTransactionTable() {
  const isLoading = useCryptoStore((s) => s.isLoading);
  const activeFilter = useCryptoStore((s) => s.activeFilter);
  const setActiveFilter = useCryptoStore((s) => s.setActiveFilter);
  const getTransactionsWithAsset = useCryptoStore((s) => s.getTransactionsWithAsset);

  const allTxs = getTransactionsWithAsset();

  const filtered = allTxs.filter((tx) => {
    const symbol = tx.asset?.symbol ?? "";
    if (activeFilter === "all") return true;
    return symbol === activeFilter;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFilter(f.id)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150"
            style={
              activeFilter === f.id
                ? {
                    backgroundColor: "color-mix(in srgb, var(--platform-crypto) 12%, transparent)",
                    color: "var(--platform-crypto)",
                  }
                : { color: "var(--text-muted)" }
            }
            aria-pressed={activeFilter === f.id}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs self-center font-mono" style={{ color: "var(--text-muted)" }}>
          {filtered.length} transacciones
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Sin transacciones para el filtro seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "480px" }}
            >
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr
                    className="sticky top-0 z-10"
                    style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}
                  >
                    {["Fecha", "Tipo", "Activo", "Cantidad", "Precio", "Importe", "Fee", "P&L actual"].map(
                      (col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx, i) => {
                    const typeStyle = TX_TYPE_COLORS[tx.type] ?? TX_TYPE_COLORS.transfer_in;
                    const plColor =
                      tx.pl_since_buy_eur == null
                        ? "var(--text-muted)"
                        : tx.pl_since_buy_eur >= 0
                          ? "var(--platform-patrimonio, #2E7D6B)"
                          : "#A32D2D";

                    return (
                      <tr
                        key={tx.id}
                        className="transition-colors duration-100"
                        style={{
                          borderBottom:
                            i < filtered.length - 1
                              ? "1px solid var(--border-stone, rgba(160,120,80,0.10))"
                              : "none",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                            "rgba(160,120,80,0.04)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = "")
                        }
                      >
                        <td
                          className="px-3 py-2.5 font-mono text-xs whitespace-nowrap"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {new Date(tx.transaction_date).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: typeStyle.bg,
                              color: typeStyle.color,
                              border: typeStyle.border,
                            }}
                          >
                            {TX_TYPE_LABELS[tx.type]}
                          </span>
                        </td>
                        <td
                          className="px-3 py-2.5 font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {tx.asset ? (
                            <div className="flex items-center gap-1.5">
                              {tx.asset.color && (
                                <span
                                  className="h-2 w-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: tx.asset.color }}
                                  aria-hidden="true"
                                />
                              )}
                              <span className="font-mono text-xs">{tx.asset.symbol}</span>
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td
                          className="px-3 py-2.5 font-mono text-xs tabular-nums"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {tx.quantity != null ? tx.quantity.toFixed(8) : "—"}
                        </td>
                        <td
                          className="px-3 py-2.5 font-mono text-xs tabular-nums"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {tx.price_eur != null ? formatEur(tx.price_eur) : "—"}
                        </td>
                        <td
                          className="px-3 py-2.5 font-mono text-xs tabular-nums"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {tx.amount_eur != null ? formatEur(tx.amount_eur) : "—"}
                        </td>
                        <td
                          className="px-3 py-2.5 font-mono text-xs tabular-nums"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {tx.fee_eur != null ? formatEur(tx.fee_eur) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          {tx.pl_since_buy_eur != null ? (
                            <span className="font-mono text-xs tabular-nums" style={{ color: plColor }}>
                              {tx.pl_since_buy_eur >= 0 ? "+" : ""}
                              {formatEur(tx.pl_since_buy_eur)}
                              {tx.pl_since_buy_pct != null && (
                                <span className="opacity-70 ml-1">
                                  ({formatPct(tx.pl_since_buy_pct)})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
