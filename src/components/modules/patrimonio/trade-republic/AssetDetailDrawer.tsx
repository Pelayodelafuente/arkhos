"use client";

import { useState, useMemo } from "react";
import { X, Plus, Pencil, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { deleteTransaction } from "@/app/actions/patrimonio";
import { useUIStore } from "@/stores/ui-store";
import { Button, Badge } from "@/components/ui";
import { TransactionFormModal } from "./TransactionFormModal";
import { AssetAccumulationChart } from "./AssetAccumulationChart";
import { CATEGORY_LABELS } from "@/types/patrimonio";
import type { PortfolioTransaction, TransactionType } from "@/types/patrimonio";

interface AssetDetailDrawerProps {
  assetId: string | null;
  onClose: () => void;
}

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const fmtQty = (v: number) =>
  v === Math.floor(v)
    ? v.toLocaleString("es-ES")
    : v.toLocaleString("es-ES", { maximumFractionDigits: 6 });

const TX_BADGE: Record<TransactionType, { label: string; color: string; bg: string }> = {
  buy: { label: "Compra", color: "#2E7D6B", bg: "#2E7D6B1A" },
  savings_plan: { label: "Plan ahorro", color: "#3B78B0", bg: "#3B78B01A" },
  saveback: { label: "Saveback", color: "#7260C4", bg: "#7260C41A" },
  sell: { label: "Venta", color: "#A32D2D", bg: "#A32D2D1A" },
  dividend: { label: "Dividendo", color: "#B07A3A", bg: "#B07A3A1A" },
  transfer_in: { label: "Entrada", color: "#2E7D6B", bg: "#2E7D6B1A" },
  transfer_out: { label: "Salida", color: "#A32D2D", bg: "#A32D2D1A" },
};

export function AssetDetailDrawer({ assetId, onClose }: AssetDetailDrawerProps) {
  const assets = usePatrimonioStore((s) => s.assets);
  const transactions = usePatrimonioStore((s) => s.transactions);
  const platforms = usePatrimonioStore((s) => s.platforms);
  const addToast = useUIStore((s) => s.addToast);

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

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteTransaction(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (result.success) {
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
              style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}
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
                          background: "var(--module-patrimonio)1A",
                          color: "var(--module-patrimonio)",
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
                      color: plPositive ? "#2E7D6B" : "#A32D2D",
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

              {/* Transactions */}
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
                                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
