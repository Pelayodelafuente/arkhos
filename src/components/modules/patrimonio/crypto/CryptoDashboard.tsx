"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";
import { CryptoKPIs } from "./CryptoKPIs";
import { CryptoAssetCard } from "./CryptoAssetCard";
import { CryptoDCAChart } from "./CryptoDCAChart";
import { CryptoEvolutionChart } from "./CryptoEvolutionChart";
import { CryptoDistributionDonut } from "./CryptoDistributionDonut";
import { CryptoTransactionTable } from "./CryptoTransactionTable";
import { AavePositionPanel } from "./AavePositionPanel";
import { CryptoPlanPanel } from "./CryptoPlanPanel";
import { UpdateOnChainBalancesButton } from "./UpdateOnChainBalancesButton";

const CRYPTO_COLOR = "var(--platform-crypto)";

const TABS = [
  { id: "dashboard" as const, label: "Resumen" },
  { id: "transactions" as const, label: "Transacciones" },
  { id: "defi" as const, label: "DeFi" },
  { id: "plan" as const, label: "Plan DCA" },
  { id: "costs" as const, label: "Costes" },
] as const;

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

// ── Costs panel ───────────────────────────────────────────────────────────────

const EXCHANGE_TYPES = new Set(["buy", "sell"]);
const NETWORK_TYPES  = new Set(["transfer_out", "transfer_in"]);

function FeeBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "rgba(160,120,80,0.12)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function FeeTypeRow({
  label,
  description,
  amount,
  total,
  color,
  count,
}: {
  label: string;
  description: string;
  amount: number;
  total: number;
  color: string;
  count: number;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{label}</span>
          <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>({count} op.)</span>
        </div>
        <span className="font-mono text-sm tabular-nums flex-shrink-0" style={{ color }}>
          {formatEur(amount)}
        </span>
      </div>
      <FeeBar pct={pct} color={color} />
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{description}</p>
    </div>
  );
}

function CostBreakdownPanel() {
  const isLoading = useCryptoStore((s) => s.isLoading);
  const getTotalFees = useCryptoStore((s) => s.getTotalFees);
  const transactions = useCryptoStore((s) => s.transactions);
  const assets = useCryptoStore((s) => s.assets);

  if (isLoading) {
    return <Skeleton className="h-72 rounded-xl" />;
  }

  const totalFees = getTotalFees();
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  // Split by fee category
  let exchangeFees = 0;
  let exchangeCount = 0;
  let networkFees = 0;
  let networkCount = 0;

  const feesByAsset = new Map<string, number>();

  for (const tx of transactions) {
    if (!tx.fee_eur || tx.fee_eur <= 0) continue;
    const symbol = tx.asset_id ? (assetMap.get(tx.asset_id)?.symbol ?? "Otros") : "Otros";
    feesByAsset.set(symbol, (feesByAsset.get(symbol) ?? 0) + tx.fee_eur);

    if (EXCHANGE_TYPES.has(tx.type)) {
      exchangeFees += tx.fee_eur;
      exchangeCount++;
    } else if (NETWORK_TYPES.has(tx.type)) {
      networkFees += tx.fee_eur;
      networkCount++;
    }
  }

  const breakdown = Array.from(feesByAsset.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* Total header card */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
          Total comisiones pagadas
        </p>
        <p className="font-mono text-2xl font-semibold tabular-nums" style={{ color: "var(--platform-crypto)" }}>
          {formatEur(totalFees)}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          En {transactions.filter((t) => (t.fee_eur ?? 0) > 0).length} transacciones con comisión
        </p>
      </div>

      {/* By fee type */}
      <div
        className="rounded-xl p-4 space-y-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          Por tipo de comisión
        </p>
        <FeeTypeRow
          label="Comisiones de exchange"
          description="Cargo por compra/venta en Bit2Me (aprox. 0.95% por operación)"
          amount={exchangeFees}
          total={totalFees}
          color="#B07A3A"
          count={exchangeCount}
        />
        <FeeTypeRow
          label="Comisiones de red"
          description="Gas fee o fee de transferencia al mover crypto a TrustWallet / MetaMask"
          amount={networkFees}
          total={totalFees}
          color="#627EEA"
          count={networkCount}
        />
      </div>

      {/* By asset */}
      {breakdown.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}
          >
            <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
              Por activo
            </p>
          </div>
          <ul role="list">
            {breakdown.map(([symbol, fee], i) => {
              const asset = assets.find((a) => a.symbol === symbol);
              const pct = totalFees > 0 ? (fee / totalFees) * 100 : 0;
              return (
                <li
                  key={symbol}
                  className="px-4 py-3 space-y-1.5"
                  style={{
                    borderBottom:
                      i < breakdown.length - 1
                        ? "1px solid var(--border-stone, rgba(160,120,80,0.08))"
                        : "none",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {asset?.color && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: asset.color }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="font-mono text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                        {pct.toFixed(1)}%
                      </span>
                      <span className="font-mono text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {formatEur(fee)}
                      </span>
                    </div>
                  </div>
                  <FeeBar pct={pct} color={asset?.color ?? "var(--platform-crypto)"} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function CryptoDashboard() {
  const isLoading = useCryptoStore((s) => s.isLoading);
  const activeTab = useCryptoStore((s) => s.activeTab);
  const setActiveTab = useCryptoStore((s) => s.setActiveTab);
  const assets = useCryptoStore((s) => s.assets);
  const defiPositions = useCryptoStore((s) => s.defiPositions);
  const monthlyPlan = useCryptoStore((s) => s.monthlyPlan);
  const getOverview = useCryptoStore((s) => s.getOverview);
  const getAssetsWithPL = useCryptoStore((s) => s.getAssetsWithPL);

  const overview = useMemo(() => getOverview(), [assets, defiPositions, monthlyPlan, getOverview]);
  const assetsWithPL = useMemo(() => getAssetsWithPL(), [assets, getAssetsWithPL]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1">
      {/* KPIs */}
      <CryptoKPIs overview={overview} isLoading={isLoading} />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
            style={
              activeTab === tab.id
                ? {
                    backgroundColor: `color-mix(in srgb, ${CRYPTO_COLOR} 12%, transparent)`,
                    color: CRYPTO_COLOR,
                  }
                : { color: "var(--text-muted)" }
            }
            aria-pressed={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: dashboard */}
      {activeTab === "dashboard" && (
        <div className="space-y-5">
          {/* Asset cards */}
          {assetsWithPL.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assetsWithPL.map((asset) => (
                <CryptoAssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CryptoDCAChart />
            <CryptoDistributionDonut />
          </div>

          {/* Evolution chart */}
          <CryptoEvolutionChart />

          {/* Update button */}
          <div className="flex justify-end">
            <UpdateOnChainBalancesButton />
          </div>
        </div>
      )}

      {/* Tab: transactions */}
      {activeTab === "transactions" && <CryptoTransactionTable />}

      {/* Tab: defi */}
      {activeTab === "defi" && <AavePositionPanel />}

      {/* Tab: plan */}
      {activeTab === "plan" && <CryptoPlanPanel />}

      {/* Tab: costs */}
      {activeTab === "costs" && <CostBreakdownPanel />}
    </div>
  );
}
