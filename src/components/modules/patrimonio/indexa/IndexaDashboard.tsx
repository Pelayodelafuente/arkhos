"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui";
import { useIndexaStore } from "@/stores/indexa-store";
import { IndexaKPIs } from "./IndexaKPIs";
import { IndexaPositionsCards } from "./IndexaPositionsCards";
import { IndexaMonthlyTable } from "./IndexaMonthlyTable";
import { IndexaEvolutionChart } from "./IndexaEvolutionChart";
import { IndexaTWRChart } from "./IndexaTWRChart";
import { IndexaRiskMetrics } from "./IndexaRiskMetrics";
import { IndexaPlanPanel } from "./IndexaPlanPanel";
import { IndexaProjectionSimulator } from "./IndexaProjectionSimulator";
import { IndexaFiscalPanel } from "./IndexaFiscalPanel";
import { UpdateIndexaPricesModal } from "./UpdateIndexaPricesModal";

const TABS = [
  { id: "dashboard" as const, label: "Resumen" },
  { id: "performance" as const, label: "Rendimiento" },
  { id: "plan" as const, label: "Plan de Ahorro" },
  { id: "fiscal" as const, label: "Fiscal" },
];

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

// Donut chart for allocation
const FUND_TYPE_COLOR: Record<string, string> = {
  equity: "#3B78B0",
  bond: "#7260C4",
  cash: "#888780",
};

const FUND_TYPE_LABEL: Record<string, string> = {
  equity: "Acciones",
  bond: "Bonos",
  cash: "Liquidez",
};

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs font-mono"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        color: "var(--text-primary)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      <p>
        <span style={{ color: entry.payload.fill }}>{entry.name}: </span>
        <strong>{formatEur(entry.value)}</strong>
      </p>
    </div>
  );
}

type ActiveTab = "dashboard" | "performance" | "plan" | "fiscal";

export function IndexaDashboard() {
  const [showPricesModal, setShowPricesModal] = useState(false);

  const activeTab = useIndexaStore((s) => s.activeTab);
  const setActiveTab = useIndexaStore((s) => s.setActiveTab);
  const overview = useIndexaStore((s) => s.overview);
  const positions = useIndexaStore((s) => s.positions);
  const transactions = useIndexaStore((s) => s.transactions);
  const funds = useIndexaStore((s) => s.funds);
  const plan = useIndexaStore((s) => s.plan);
  const isLoading = useIndexaStore((s) => s.isLoading);
  const getMonthlyReturnsTable = useIndexaStore((s) => s.getMonthlyReturnsTable);
  const getTWRChartData = useIndexaStore((s) => s.getTWRChartData);
  const getEvolutionData = useIndexaStore((s) => s.getEvolutionData);
  const getProjection = useIndexaStore((s) => s.getProjection);

  // Build donut data from positions
  const donutData = positions
    .filter((p) => p.total_value > 0)
    .map((p) => ({
      name: FUND_TYPE_LABEL[p.fund_type ?? "equity"] ?? (p.fund?.name ?? "Desconocido"),
      value: p.total_value,
      fill: FUND_TYPE_COLOR[p.fund_type ?? "equity"] ?? "#888780",
    }));

  // Placeholder contribution handler — will be wired to real API later
  const handleContributionConfirm = async (data: {
    fundId: string;
    date: string;
    amount: number;
    shares: number | null;
    pricePerShare: number | null;
    notes: string;
  }) => {
    console.log("[IndexaDashboard] Contribution to register:", data);
    // TODO: call server action / API route
  };

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div
        className="flex gap-1 rounded-xl p-1 overflow-x-auto"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
        role="tablist"
        aria-label="Secciones de Indexa Capital"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 whitespace-nowrap"
            style={{
              backgroundColor: activeTab === tab.id ? "var(--platform-indexa, #3B78B0)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Update prices button */}
      <div className="flex items-center justify-between gap-3">
        {overview?.last_updated ? (
          <p className="font-mono text-xs text-muted-foreground">
            Precios actualizados:{" "}
            {new Date(overview.last_updated).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">Sin actualización reciente</p>
        )}
        <button
          type="button"
          onClick={() => setShowPricesModal(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          style={{
            backgroundColor: "rgba(59,120,176,0.10)",
            color: "#3B78B0",
            border: "1px solid rgba(59,120,176,0.20)",
          }}
        >
          <RefreshCw size={12} strokeWidth={2} />
          Actualizar precios
        </button>
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        role="tabpanel"
        aria-label={TABS.find((t) => t.id === activeTab)?.label}
      >
        {/* RESUMEN */}
        {activeTab === "dashboard" && (
          <div className="space-y-5">
            <IndexaKPIs overview={overview} isLoading={isLoading} />
            <IndexaPositionsCards positions={positions} isLoading={isLoading} />

            {/* Distribution donut */}
            {!isLoading && donutData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
                }}
              >
                <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  Distribución de activos
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="flex flex-col gap-2">
                    {donutData.map((entry) => {
                      const alloc =
                        overview && overview.total_value > 0
                          ? (entry.value / overview.total_value) * 100
                          : 0;
                      return (
                        <div key={entry.name} className="flex items-center gap-2.5 text-sm">
                          <div
                            className="h-3 w-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: entry.fill }}
                            aria-hidden="true"
                          />
                          <span style={{ color: "var(--text-secondary)" }}>{entry.name}</span>
                          <span className="font-mono font-semibold ml-auto tabular-nums" style={{ color: "var(--text-primary)" }}>
                            {alloc.toFixed(1)}%
                          </span>
                          <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                            {formatEur(entry.value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {isLoading && <Skeleton className="h-48 rounded-xl" />}
          </div>
        )}

        {/* RENDIMIENTO */}
        {activeTab === "performance" && (
          <div className="space-y-5">
            <IndexaMonthlyTable rows={getMonthlyReturnsTable()} isLoading={isLoading} />
            <IndexaEvolutionChart data={getEvolutionData()} isLoading={isLoading} />
            <IndexaTWRChart data={getTWRChartData()} isLoading={isLoading} />
            <IndexaRiskMetrics overview={overview} isLoading={isLoading} />
          </div>
        )}

        {/* PLAN */}
        {activeTab === "plan" && (
          <div className="space-y-5">
            <IndexaPlanPanel
              plan={plan}
              transactions={transactions}
              funds={funds}
              isLoading={isLoading}
              onContributionConfirm={handleContributionConfirm}
            />
            <IndexaProjectionSimulator
              getProjection={getProjection}
              defaultMonthlyContrib={plan?.monthly_amount ?? 152}
            />
          </div>
        )}

        {/* FISCAL */}
        {activeTab === "fiscal" && (
          <IndexaFiscalPanel
            overview={overview}
            funds={funds}
            positions={positions}
            isLoading={isLoading}
          />
        )}
      </motion.div>

      {/* Modal */}
      {showPricesModal && (
        <UpdateIndexaPricesModal onClose={() => setShowPricesModal(false)} />
      )}
    </div>
  );
}
