"use client";

import { useState, useMemo } from "react";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { deleteTransaction } from "@/app/actions/patrimonio";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui";
import { C } from "@/lib/patrimonio/chart-colors";
import { TransactionFormModal } from "./TransactionFormModal";
import { AssetAccumulationChart } from "./AssetAccumulationChart";
import { CATEGORY_LABELS } from "@/types/patrimonio";
import type { PortfolioTransaction, TransactionType } from "@/types/patrimonio";

interface AssetDetailDrawerProps {
  assetId: string | null;
  onClose: () => void;
}

type ActiveTab = "resumen" | "transacciones" | "analisis";

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const fmtQty = (v: number) =>
  v === Math.floor(v)
    ? v.toLocaleString("es-ES")
    : v.toLocaleString("es-ES", { maximumFractionDigits: 6 });

const TX_BADGE: Record<TransactionType, { label: string; color: string; bg: string }> = {
  buy:          { label: "Compra",      color: C.green,  bg: `${C.green}1A`  },
  savings_plan: { label: "Plan ahorro", color: C.blue,   bg: `${C.blue}1A`   },
  saveback:     { label: "Saveback",    color: C.purple, bg: `${C.purple}1A` },
  sell:         { label: "Venta",       color: C.red,    bg: `${C.red}1A`    },
  dividend:     { label: "Dividendo",   color: C.amber,  bg: `${C.amber}1A`  },
  transfer_in:  { label: "Entrada",     color: C.green,  bg: `${C.green}1A`  },
  transfer_out: { label: "Salida",      color: C.red,    bg: `${C.red}1A`    },
};

// Timeline dot color per transaction type
const TX_DOT_COLOR: Record<TransactionType, string> = {
  buy:          "#2E7D6B",
  savings_plan: "#B07A3A",
  saveback:     "#7260C4",
  sell:         "#A32D2D",
  dividend:     "#3B78B0",
  transfer_in:  "#2E7D6B",
  transfer_out: "#A32D2D",
};

function formatDateDDMMYYYY(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function AssetDetailDrawer({ assetId, onClose }: AssetDetailDrawerProps) {
  const assets = usePatrimonioStore((s) => s.assets);
  const transactions = usePatrimonioStore((s) => s.transactions);
  const setAssets = usePatrimonioStore((s) => s.setAssets);
  const setTransactions = usePatrimonioStore((s) => s.setTransactions);
  const setSnapshots = usePatrimonioStore((s) => s.setSnapshots);
  const setOverview = usePatrimonioStore((s) => s.setOverview);
  const addToast = useUIStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<ActiveTab>("resumen");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<PortfolioTransaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const asset = useMemo(() => assets.find((a) => a.id === assetId) ?? null, [assets, assetId]);

  const assetTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.asset_id === assetId)
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)),
    [transactions, assetId]
  );

  const platformId = useMemo(() => {
    if (!asset) return "";
    return asset.platform_id;
  }, [asset]);

  const currentValue = asset
    ? (asset.current_price_eur ?? asset.current_price ?? 0) * asset.current_quantity ||
      asset.total_invested
    : 0;

  const plAmount = asset ? currentValue - asset.total_invested : 0;
  const plPercentage = asset && asset.total_invested > 0 ? (plAmount / asset.total_invested) * 100 : 0;
  const plPositive = plAmount >= 0;

  // DCA analysis: weighted average price from buy/savings_plan transactions
  const dcaAnalysis = useMemo(() => {
    const buyTxs = assetTransactions.filter(
      (t) => (t.type === "buy" || t.type === "savings_plan") && t.quantity != null && t.price_per_unit != null
    );
    if (buyTxs.length < 2) return null;
    const totalQty = buyTxs.reduce((s, t) => s + (t.quantity ?? 0), 0);
    const weightedSum = buyTxs.reduce((s, t) => s + (t.quantity ?? 0) * (t.price_per_unit ?? 0), 0);
    const weightedAvgPrice = totalQty > 0 ? weightedSum / totalQty : 0;
    return { weightedAvgPrice, totalQty };
  }, [assetTransactions]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteTransaction(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (result.success) {
      if (result.data) {
        setAssets(result.data.assets);
        setTransactions(result.data.transactions);
        setSnapshots(result.data.snapshots);
        if (result.data.overview) setOverview(result.data.overview);
      }
      addToast("Transacción eliminada", "success");
    } else {
      addToast(result.error ?? "Error al eliminar", "error");
    }
  }

  function handleEditTx(tx: PortfolioTransaction) {
    setEditingTransaction(tx);
    setShowTransactionModal(true);
  }

  function handleCloseTxModal() {
    setShowTransactionModal(false);
    setEditingTransaction(null);
  }

  const isOpen = assetId !== null;

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: "resumen", label: "Resumen" },
    { key: "transacciones", label: "Transacciones" },
    { key: "analisis", label: "Análisis" },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden sm:w-[480px]"
              style={{ background: "var(--bg-card)", borderLeft: "1px solid var(--border)" }}
              role="complementary"
              aria-label="Detalle del activo"
            >
              {/* Header */}
              <div
                className="flex flex-shrink-0 items-start justify-between gap-4 border-b px-6 py-5"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="min-w-0 flex-1">
                  <h2
                    className="font-heading text-xl leading-tight"
                    style={{ color: "var(--foreground)" }}
                  >
                    {asset?.name ?? "Activo"}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {asset?.ticker && (
                      <span
                        className="font-mono text-xs font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {asset.ticker}
                      </span>
                    )}
                    {asset?.isin && (
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {asset.isin}
                      </span>
                    )}
                    {asset?.category && (
                      <span
                        className="rounded-md px-1.5 py-0.5 text-xs"
                        style={{
                          background: "rgba(46,125,107,0.1)",
                          color: "var(--module-patrimonio)",
                          border: "1px solid rgba(46,125,107,0.25)",
                        }}
                      >
                        {CATEGORY_LABELS[asset.category]}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  aria-label="Cerrar panel"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>

              {/* Tabs */}
              <div
                className="flex flex-shrink-0 gap-0 border-b px-6"
                style={{ borderColor: "var(--border)" }}
              >
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className="border-b-2 px-4 py-3 text-sm font-medium transition-colors"
                      style={{
                        borderColor: isActive ? "var(--color-gain)" : "transparent",
                        color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-tertiary)";
                        }
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab: Resumen */}
              {activeTab === "resumen" && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {/* KPIs */}
                  {asset && (
                    <div
                      className="grid flex-shrink-0 grid-cols-2 gap-px border-b"
                      style={{ borderColor: "var(--border)", background: "var(--border)" }}
                    >
                      {[
                        {
                          label: "Cantidad",
                          value: fmtQty(asset.current_quantity),
                          mono: true,
                          color: "var(--foreground)",
                        },
                        {
                          label: "Precio medio",
                          value: fmt.format(asset.avg_buy_price),
                          mono: true,
                          color: "var(--foreground)",
                        },
                        {
                          label: "Valor actual",
                          value: fmt.format(currentValue),
                          mono: true,
                          color: "var(--module-patrimonio)",
                        },
                        {
                          label: "P&L",
                          value: `${plPositive ? "+" : ""}${fmt.format(plAmount)} (${plPositive ? "+" : ""}${plPercentage.toFixed(2)}%)`,
                          mono: true,
                          color: plPositive ? C.green : C.red,
                        },
                      ].map((kpi) => (
                        <div
                          key={kpi.label}
                          className="flex flex-col gap-0.5 px-5 py-4"
                          style={{ background: "var(--card)" }}
                        >
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {kpi.label}
                          </span>
                          <span
                            className={`text-sm font-semibold${kpi.mono ? " font-mono" : ""}`}
                            style={{ color: kpi.color }}
                          >
                            {kpi.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chart */}
                  {assetTransactions.length >= 2 && asset && (
                    <div className="flex-shrink-0 border-b px-4 py-4" style={{ borderColor: "var(--border)" }}>
                      <AssetAccumulationChart
                        transactions={assetTransactions}
                        assetName={asset.name}
                      />
                    </div>
                  )}

                  {/* Transactions (compact table) */}
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div
                      className="flex flex-shrink-0 items-center justify-between px-6 py-4"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                        {assetTransactions.length} transaccion
                        {assetTransactions.length === 1 ? "" : "es"}
                      </span>
                      <Button
                        variant="ghost"
                        onClick={() => setShowTransactionModal(true)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Plus size={14} strokeWidth={2} />
                        Añadir
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {assetTransactions.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                            Sin transacciones registradas · Importa el historial desde el botón principal
                          </p>
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                              {["Fecha", "Tipo", "Cantidad", "Precio/ud", "Total", ""].map((h) => (
                                <th
                                  key={h}
                                  className="px-4 py-2.5 text-left font-medium"
                                  style={{ color: "var(--text-tertiary)" }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {assetTransactions.map((tx) => {
                              const badge = TX_BADGE[tx.type] ?? TX_BADGE.buy;
                              const isDeleting = deletingId === tx.id;
                              const isConfirming = confirmDeleteId === tx.id;

                              return (
                                <tr
                                  key={tx.id}
                                  className="group transition-colors"
                                  style={{ borderBottom: "1px solid var(--border)" }}
                                >
                                  <td
                                    className="px-4 py-2.5 font-mono"
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    {new Date(tx.transaction_date).toLocaleDateString("es-ES", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "2-digit",
                                    })}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span
                                      className="rounded-md px-1.5 py-0.5 text-xs font-medium"
                                      style={{ color: badge.color, background: badge.bg }}
                                    >
                                      {badge.label}
                                    </span>
                                  </td>
                                  <td
                                    className="px-4 py-2.5 font-mono"
                                    style={{ color: "var(--foreground)" }}
                                  >
                                    {tx.quantity != null ? fmtQty(tx.quantity) : "—"}
                                  </td>
                                  <td
                                    className="px-4 py-2.5 font-mono"
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    {tx.price_per_unit != null
                                      ? fmt.format(tx.price_per_unit)
                                      : "—"}
                                  </td>
                                  <td
                                    className="px-4 py-2.5 font-mono font-medium"
                                    style={{ color: "var(--module-patrimonio)" }}
                                  >
                                    {fmt.format(tx.total_amount)}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {isConfirming ? (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleDelete(tx.id)}
                                          disabled={isDeleting}
                                          className="rounded px-1.5 py-0.5 text-xs font-medium transition-colors"
                                          style={{ color: "#A32D2D" }}
                                        >
                                          {isDeleting ? "…" : "Confirmar"}
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="rounded px-1.5 py-0.5 text-xs transition-colors"
                                          style={{ color: "var(--text-tertiary)" }}
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                                        <button
                                          onClick={() => handleEditTx(tx)}
                                          className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                                          style={{ color: "var(--text-tertiary)" }}
                                          aria-label="Editar transacción"
                                        >
                                          <Pencil size={12} strokeWidth={1.75} />
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteId(tx.id)}
                                          className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                                          style={{ color: "var(--text-tertiary)" }}
                                          aria-label="Eliminar transacción"
                                        >
                                          <Trash2 size={12} strokeWidth={1.75} />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Transacciones — vertical timeline */}
              {activeTab === "transacciones" && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div
                    className="flex flex-shrink-0 items-center justify-between px-6 py-4"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {assetTransactions.length} transaccion
                      {assetTransactions.length === 1 ? "" : "es"}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => setShowTransactionModal(true)}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <Plus size={14} strokeWidth={2} />
                      Añadir
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {assetTransactions.length === 0 ? (
                      <p className="text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                        Sin transacciones registradas
                      </p>
                    ) : (
                      <ol className="relative" aria-label="Historial de transacciones">
                        {assetTransactions.map((tx, idx) => {
                          const dotColor = TX_DOT_COLOR[tx.type] ?? "#2E7D6B";
                          const badge = TX_BADGE[tx.type] ?? TX_BADGE.buy;
                          const isLast = idx === assetTransactions.length - 1;
                          return (
                            <li key={tx.id} className="relative flex gap-4 pb-6">
                              {/* Vertical line */}
                              {!isLast && (
                                <span
                                  className="absolute left-[3px] top-4 bottom-0 w-px"
                                  style={{ backgroundColor: "var(--border-stone)" }}
                                  aria-hidden="true"
                                />
                              )}
                              {/* Dot */}
                              <span
                                className="relative z-10 mt-1 flex h-2 w-2 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: dotColor, marginTop: "6px" }}
                                aria-hidden="true"
                              />
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="font-mono text-xs"
                                    style={{ color: "var(--text-tertiary)" }}
                                  >
                                    {formatDateDDMMYYYY(tx.transaction_date)}
                                  </span>
                                  <span
                                    className="rounded-md px-1.5 py-0.5 text-xs font-medium"
                                    style={{ color: badge.color, background: badge.bg }}
                                  >
                                    {badge.label}
                                  </span>
                                </div>
                                <div
                                  className="mt-0.5 flex flex-wrap gap-2 font-mono text-xs"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {tx.quantity != null && (
                                    <span>{fmtQty(tx.quantity)} ud.</span>
                                  )}
                                  <span>{fmt.format(tx.total_amount)}</span>
                                  {tx.price_per_unit != null && (
                                    <span style={{ color: "var(--text-tertiary)" }}>
                                      @ {fmt.format(tx.price_per_unit)}/ud
                                    </span>
                                  )}
                                </div>
                                {tx.notes && (
                                  <p
                                    className="mt-0.5 text-xs"
                                    style={{ color: "var(--text-tertiary)" }}
                                  >
                                    {tx.notes}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Análisis — DCA */}
              {activeTab === "analisis" && (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
                  {dcaAnalysis === null ? (
                    <div className="py-8 text-center">
                      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                        Añade más transacciones para ver el análisis DCA
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {/* Price comparison */}
                      <div
                        className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border"
                        style={{ borderColor: "var(--border)", background: "var(--border)" }}
                      >
                        <div
                          className="flex flex-col gap-1 px-5 py-4"
                          style={{ background: "var(--card)" }}
                        >
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            Precio medio (DCA)
                          </span>
                          <span
                            className="font-mono text-lg font-semibold"
                            style={{ color: "var(--foreground)" }}
                          >
                            {fmt.format(dcaAnalysis.weightedAvgPrice)}
                          </span>
                        </div>
                        <div
                          className="flex flex-col gap-1 px-5 py-4"
                          style={{ background: "var(--card)" }}
                        >
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            Precio actual
                          </span>
                          <span
                            className="font-mono text-lg font-semibold"
                            style={{ color: "var(--module-patrimonio)" }}
                          >
                            {asset?.current_price_eur != null
                              ? fmt.format(asset.current_price_eur)
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Difference */}
                      {asset?.current_price_eur != null && (
                        <div
                          className="rounded-xl border p-5"
                          style={{ borderColor: "var(--border)", background: "var(--card)" }}
                        >
                          {(() => {
                            const diff = asset.current_price_eur - dcaAnalysis.weightedAvgPrice;
                            const diffPct =
                              dcaAnalysis.weightedAvgPrice > 0
                                ? (diff / dcaAnalysis.weightedAvgPrice) * 100
                                : 0;
                            const isAbove = diff >= 0;
                            const diffColor = isAbove ? "var(--color-gain)" : "var(--color-loss)";
                            return (
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                    Diferencia respecto al precio medio
                                  </span>
                                </div>
                                <span
                                  className="font-mono text-2xl font-bold"
                                  style={{ color: diffColor }}
                                >
                                  {isAbove ? "+" : ""}
                                  {fmt.format(diff)}{" "}
                                  <span className="text-base">
                                    ({isAbove ? "+" : ""}
                                    {diffPct.toFixed(2)}%)
                                  </span>
                                </span>
                                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                  Break-even en{" "}
                                  <span className="font-mono font-medium" style={{ color: "var(--foreground)" }}>
                                    {fmt.format(dcaAnalysis.weightedAvgPrice)}
                                  </span>{" "}
                                  — actualmente{" "}
                                  <span
                                    className="font-mono font-medium"
                                    style={{ color: diffColor }}
                                  >
                                    {fmt.format(Math.abs(diff))}
                                  </span>{" "}
                                  {isAbove ? "por encima" : "por debajo"}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Buy transactions count */}
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Basado en{" "}
                        {
                          assetTransactions.filter(
                            (t) => t.type === "buy" || t.type === "savings_plan"
                          ).length
                        }{" "}
                        transacciones de compra ·{" "}
                        {fmtQty(dcaAnalysis.totalQty)} unidades totales adquiridas
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {asset && (
        <TransactionFormModal
          isOpen={showTransactionModal}
          onClose={handleCloseTxModal}
          assetId={asset.id}
          platformId={platformId}
          transaction={editingTransaction ?? undefined}
        />
      )}
    </>
  );
}
