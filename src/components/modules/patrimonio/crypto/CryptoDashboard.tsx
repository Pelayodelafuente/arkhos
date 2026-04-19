"use client";

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

// ── Altcoins table ────────────────────────────────────────────────────────────

function AltcoinsTable() {
  const getAltcoins = useCryptoStore((s) => s.getAltcoins);
  const altcoins = getAltcoins();

  if (altcoins.length === 0) return null;

  return (
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
          Altcoins
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.10))" }}>
              {["Activo", "Balance", "Valor", "P&L €", "P&L %", "% Cartera"].map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-card)" }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {altcoins.map((a, i) => {
              const plColor = a.pl_eur >= 0 ? "var(--platform-patrimonio, #2E7D6B)" : "#A32D2D";
              return (
                <tr
                  key={a.id}
                  style={{
                    borderBottom:
                      i < altcoins.length - 1
                        ? "1px solid var(--border-stone, rgba(160,120,80,0.08))"
                        : "none",
                  }}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {a.color && (
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: a.color }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="font-mono text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                        {a.symbol}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {a.name}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-3 py-2.5 font-mono text-xs tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {a.current_balance.toFixed(4)}
                  </td>
                  <td
                    className="px-3 py-2.5 font-mono text-xs tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatEur(a.current_value_eur)}
                  </td>
                  <td
                    className="px-3 py-2.5 font-mono text-xs tabular-nums"
                    style={{ color: plColor }}
                  >
                    {a.pl_eur >= 0 ? "+" : ""}
                    {formatEur(a.pl_eur)}
                  </td>
                  <td
                    className="px-3 py-2.5 font-mono text-xs tabular-nums"
                    style={{ color: plColor }}
                  >
                    {a.pl_pct >= 0 ? "+" : ""}
                    {a.pl_pct.toFixed(2)}%
                  </td>
                  <td
                    className="px-3 py-2.5 font-mono text-xs tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {a.weight_pct.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Costs panel ───────────────────────────────────────────────────────────────

function CostBreakdownPanel() {
  const isLoading = useCryptoStore((s) => s.isLoading);
  const getTotalFees = useCryptoStore((s) => s.getTotalFees);
  const transactions = useCryptoStore((s) => s.transactions);
  const assets = useCryptoStore((s) => s.assets);

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  const totalFees = getTotalFees();

  // Group fees by asset
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const feesByAsset = new Map<string, number>();

  for (const tx of transactions) {
    if (!tx.fee_eur || tx.fee_eur <= 0) continue;
    const symbol = tx.asset_id ? (assetMap.get(tx.asset_id)?.symbol ?? "Otros") : "Otros";
    feesByAsset.set(symbol, (feesByAsset.get(symbol) ?? 0) + tx.fee_eur);
  }

  const breakdown = Array.from(feesByAsset.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* Total card */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
          Total fees pagadas
        </p>
        <p className="font-mono text-2xl font-semibold tabular-nums" style={{ color: "var(--platform-crypto)" }}>
          {formatEur(totalFees)}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Acumulado de {transactions.length} transacciones
        </p>
      </div>

      {/* Breakdown */}
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
              Desglose por activo
            </p>
          </div>
          <ul role="list">
            {breakdown.map(([symbol, fee], i) => {
              const asset = assets.find((a) => a.symbol === symbol);
              return (
                <li
                  key={symbol}
                  className="flex items-center justify-between px-4 py-3 gap-3"
                  style={{
                    borderBottom:
                      i < breakdown.length - 1
                        ? "1px solid var(--border-stone, rgba(160,120,80,0.08))"
                        : "none",
                  }}
                >
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
                  <span className="font-mono text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {formatEur(fee)}
                  </span>
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
  const getOverview = useCryptoStore((s) => s.getOverview);
  const getAssetsWithPL = useCryptoStore((s) => s.getAssetsWithPL);

  const overview = getOverview();
  const assetsWithPL = getAssetsWithPL();

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

          {/* Altcoins table */}
          <AltcoinsTable />

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
