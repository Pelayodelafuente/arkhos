"use client";

import { ChartShell, Donut } from "@/components/viz";
import { formatPct } from "@/lib/utils/format";

/**
 * Exposición por divisa (Fase 2.3).
 * Aprovecha `usdExposurePct` (ya calculado en riskMetrics) — antes solo se mostraba
 * como número en RiskMetricsCard. El resto se agrupa como EUR / otras divisas.
 */
interface Props {
  usdExposurePct: number | undefined;
}

export function CurrencyExposureDonut({ usdExposurePct }: Props) {
  if (usdExposurePct == null) return null;

  const usd = Math.max(0, Math.min(100, usdExposurePct));
  const eur = Math.max(0, 100 - usd);

  const data = [
    { name: "USD", value: usd, color: "var(--module-gastos)" },
    { name: "EUR / otras", value: eur, color: "var(--color-gain)" },
  ];

  return (
    <ChartShell title="Exposición por divisa" subtitle="% del patrimonio">
      <Donut
        data={data}
        valueFormatter={(v) => formatPct(v, false, 1)}
        centerLabel="Exposición USD"
        centerValue={formatPct(usd, false, 0)}
        height={180}
      />
    </ChartShell>
  );
}
