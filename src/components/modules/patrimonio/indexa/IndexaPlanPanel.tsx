"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, PlusCircle, ArrowDownToLine } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { RegisterContributionModal } from "./RegisterContributionModal";
import type { ContributionFormData } from "./RegisterContributionModal";
import type { IndexaMonthlyPlan, IndexaTransaction, IndexaFund } from "@/types/indexa";

import { formatEur } from "@/lib/utils/format";

const TX_TYPE_LABEL: Record<string, string> = {
  subscription: "SUSCRIPCIÓN",
  redemption: "REEMBOLSO",
  transfer_in: "TRASPASO ENT.",
  transfer_out: "TRASPASO SAL.",
};

const TX_TYPE_ACCENT: Record<string, string> = {
  subscription: "var(--platform-indexa, #3B78B0)",
  redemption: "#A32D2D",
  transfer_in: "var(--platform-tr, #2E7D6B)",
  transfer_out: "#A32D2D",
};

interface IndexaPlanPanelProps {
  plan: IndexaMonthlyPlan | null;
  transactions: IndexaTransaction[];
  funds: IndexaFund[];
  isLoading: boolean;
  onContributionConfirm: (data: ContributionFormData) => Promise<void>;
}

export function IndexaPlanPanel({
  plan,
  transactions,
  funds,
  isLoading,
  onContributionConfirm,
}: IndexaPlanPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const subscriptions = transactions
    .filter((t) => t.type === "subscription" || t.type === "transfer_in")
    .slice(0, 10);

  const formattedStart = plan?.started_at
    ? new Date(plan.started_at).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Plan card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        {plan === null ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No hay plan de aportaciones configurado
            </p>
            <Button variant="primary" size="sm">
              <PlusCircle size={14} strokeWidth={1.75} aria-hidden="true" />
              Configurar plan
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Plan de aportaciones
              </p>
              {plan.is_active && (
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"
                  style={{
                    backgroundColor: "rgba(46,125,107,0.12)",
                    color: "var(--platform-tr, #2E7D6B)",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--platform-tr, #2E7D6B)" }}
                    aria-hidden="true"
                  />
                  ACTIVO
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs mb-0.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Aportación mensual
                </p>
                <p
                  className="font-mono text-2xl font-semibold tabular-nums"
                  style={{ color: "var(--platform-indexa, #3B78B0)" }}
                >
                  {formatEur(plan.monthly_amount)}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={15} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
                <div>
                  <p className="text-xs mb-0.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    Día de ejecución
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Día {plan.execution_day} de cada mes
                  </p>
                </div>
              </div>
              {formattedStart && (
                <div className="flex items-start gap-2">
                  <Clock size={15} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true" />
                  <div>
                    <p className="text-xs mb-0.5 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      Activo desde
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formattedStart}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {plan.notes && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {plan.notes}
              </p>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              <ArrowDownToLine size={14} strokeWidth={1.75} aria-hidden="true" />
              Registrar aportación del mes
            </Button>
          </div>
        )}
      </motion.div>

      {/* Transaction history */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Historial de aportaciones
          </p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="px-4 pb-4">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sin aportaciones registradas
            </p>
          </div>
        ) : (
          <>
          <div className="divide-y" style={{ borderColor: "var(--border-stone, rgba(160,120,80,0.15))" }}>
            {subscriptions.map((tx) => {
              const color = TX_TYPE_ACCENT[tx.type] ?? "var(--text-muted)";
              const label = TX_TYPE_LABEL[tx.type] ?? tx.type.toUpperCase();
              const fundName = tx.fund?.name ?? "Fondo";
              const fundType = tx.fund?.fund_type ?? "equity";
              const fundColor = fundType === "bond" ? "#7260C4" : "#3B78B0";

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="font-mono text-xs flex-shrink-0"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {new Date(tx.transaction_date).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </span>
                    <span
                      className="truncate max-w-[100px] px-1.5 py-0.5 rounded text-xs font-semibold"
                      style={{ backgroundColor: `${fundColor}20`, color: fundColor }}
                      title={fundName}
                    >
                      {fundName}
                    </span>
                    <span
                      className="hidden sm:inline flex-shrink-0 px-1.5 py-0.5 rounded font-semibold"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 font-mono">
                    {tx.shares !== null && (
                      <span style={{ color: "var(--text-muted)" }}>
                        {new Intl.NumberFormat("es-ES", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(tx.shares)} part.
                      </span>
                    )}
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formatEur(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="flex items-center justify-end px-4 py-2 text-xs font-mono"
            style={{
              borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.15))",
              color: "var(--text-muted)",
            }}
          >
            Total aportado:&nbsp;
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {formatEur(subscriptions.reduce((sum, tx) => sum + tx.amount, 0))}
            </span>
          </div>
          </>
        )}
      </motion.div>

      <RegisterContributionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={onContributionConfirm}
        funds={funds}
        plan={plan}
      />
    </div>
  );
}
