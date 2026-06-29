"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";
import { formatEur } from "@/lib/utils/format";
import { Donut } from "@/components/viz";

const DEFAULT_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  USDC: "#2775CA",
};

export function CryptoDistributionDonut() {
  const isLoading = useCryptoStore((s) => s.isLoading);
  const rawAssets = useCryptoStore((s) => s.assets);
  const getAssetsWithPL = useCryptoStore((s) => s.getAssetsWithPL);

  // Las deps extra son triggers: el getter lee get() internamente y debe recomputar al cambiar el store
  const assets = useMemo(() => {
    void rawAssets;
    return getAssetsWithPL();
  }, [rawAssets, getAssetsWithPL]);

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  if (assets.length === 0) {
    return (
      <div
        className="rounded-xl p-6 flex items-center justify-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          minHeight: "256px",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-sm">Sin activos.</p>
      </div>
    );
  }

  const data = assets.map((a) => ({
    name: a.symbol,
    value: a.current_value_eur,
    color: a.color ?? DEFAULT_COLORS[a.symbol] ?? "var(--platform-crypto)",
  }));

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="font-heading text-base mb-3" style={{ color: "var(--text-primary)" }}>
        Distribucion del portfolio
      </p>
      <Donut data={data} valueFormatter={formatEur} />
    </div>
  );
}
