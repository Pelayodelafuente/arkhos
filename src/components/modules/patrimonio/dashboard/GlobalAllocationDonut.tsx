"use client";

import { useMemo } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";
import { formatEur } from "@/lib/utils/format";
import { ChartShell, Donut } from "@/components/viz";
import type { DonutDatum } from "@/components/viz";

const PLATFORM_CONFIG: { slug: string; name: string; color: string }[] = [
  { slug: "trade-republic", name: "Trade Republic", color: "var(--color-gain)" },
  { slug: "indexa", name: "Indexa Capital", color: "var(--module-gastos)" },
  { slug: "horos", name: "Horos", color: "var(--module-mercados)" },
  { slug: "mintos", name: "Mintos", color: "var(--accent-terracotta)" },
  { slug: "crypto", name: "Cripto", color: "var(--module-notas)" },
];

export function GlobalAllocationDonut() {
  const assets = usePatrimonioStore((s) => s.assets);
  const platforms = usePatrimonioStore((s) => s.platforms);
  const indexaOverview = useIndexaStore((s) => s.overview);
  const horosPosition = useHorosStore((s) => s.position);
  const cryptoAssets = useCryptoStore((s) => s.assets);
  const cryptoDefi = useCryptoStore((s) => s.defiPositions);
  const getCryptoOverview = useCryptoStore((s) => s.getOverview);
  // Las deps extra son triggers: el getter lee get() internamente y debe recomputar al cambiar el store
  // Sin `void x` en el cuerpo: React Compiler los elimina y dejaría de reaccionar al store.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cryptoOverview = useMemo(() => getCryptoOverview(), [cryptoAssets, cryptoDefi, getCryptoOverview]);
  const mintosOverview = useMintosStore((s) => s.overview);

  const segments = useMemo((): DonutDatum[] => {
    return PLATFORM_CONFIG.map((cfg) => {
      if (cfg.slug === "indexa") {
        return { name: cfg.name, value: indexaOverview?.total_value ?? 0, color: cfg.color };
      }
      if (cfg.slug === "horos") {
        return { name: cfg.name, value: horosPosition?.total_value ?? 0, color: cfg.color };
      }
      if (cfg.slug === "crypto") {
        return { name: cfg.name, value: cryptoOverview?.total_value_eur ?? 0, color: cfg.color };
      }
      if (cfg.slug === "mintos") {
        return { name: cfg.name, value: mintosOverview?.total_value ?? 0, color: cfg.color };
      }
      // trade-republic: include cash so the donut center matches the total patrimonio header
      const platform = platforms.find((p) => p.slug === cfg.slug);
      if (!platform) return { name: cfg.name, value: 0, color: cfg.color };
      const value = assets
        .filter((a) => a.platform_id === platform.id)
        .reduce((s, a) => s + (a.current_value ?? 0), 0);
      return { name: cfg.name, value, color: cfg.color };
    }).filter((s) => s.value > 0);
  }, [assets, platforms, indexaOverview, horosPosition, cryptoOverview, mintosOverview]);

  const hasData = segments.length > 0 && segments.some((s) => s.value > 0);

  if (!hasData) {
    return (
      <div
        className="flex h-full min-h-[280px] items-center justify-center rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm text-muted-foreground">Sin datos de distribución</p>
      </div>
    );
  }

  return (
    <ChartShell title="Distribución por plataforma">
      <Donut data={segments} centerLabel="Portfolio" valueFormatter={formatEur} />
    </ChartShell>
  );
}
