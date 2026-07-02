"use client";

// Métricas avanzadas — TWR, CAGR, Sharpe, volatilidad, max drawdown

import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { fmtNum, fmtPct } from "@/lib/sala/format";
import { WidgetShell } from "./widget-shell";
import type { SalaWidgetProps } from "./types";

export function WidgetKpis(_props: SalaWidgetProps) {
  const twr = usePatrimonioStore((s) => s.getTWR());
  const cagr = usePatrimonioStore((s) => s.getCAGR());
  const sharpe = usePatrimonioStore((s) => s.getSharpeRatio());
  const vol = usePatrimonioStore((s) => s.getAnnualizedVolatility());
  const maxDd = usePatrimonioStore((s) => s.getMaxDrawdown());
  const overview = usePatrimonioStore((s) => s.overview);

  const items: Array<{ label: string; value: string; tone?: "gain" | "loss" }> = [
    { label: "TWR", value: fmtPct(twr), tone: twr !== null && twr >= 0 ? "gain" : "loss" },
    { label: "CAGR", value: fmtPct(cagr), tone: cagr !== null && cagr >= 0 ? "gain" : "loss" },
    { label: "SHARPE", value: fmtNum(sharpe) },
    { label: "VOLAT.", value: fmtPct(vol, 1) },
    {
      label: "MAX DD",
      value: fmtPct(maxDd !== null ? -Math.abs(maxDd) : null),
      tone: "loss",
    },
    {
      label: "P&L",
      value: fmtPct(overview?.pl_percentage ?? null),
      tone: (overview?.pl_percentage ?? 0) >= 0 ? "gain" : "loss",
    },
  ];

  return (
    <WidgetShell title="Patrimonio · Métricas" accent={MODULE_HEX.patrimonio}>
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col justify-center rounded border border-[var(--sala-border)] bg-[var(--sala-surface)] px-2"
          >
            <span className="font-mono text-[9px] tracking-[0.18em] text-[var(--sala-text-dim)]">
              {item.label}
            </span>
            <span
              className="financial-number text-sm"
              style={{
                color:
                  item.tone === "gain"
                    ? "var(--sala-gain)"
                    : item.tone === "loss"
                      ? "var(--sala-loss)"
                      : "var(--sala-text)",
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
