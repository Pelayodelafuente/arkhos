"use client";

// Comparador vs índices — v1: resumen de P&L vs referencia.
// La curva normalizada completa (histórico de precios lazy) llega en F6.

import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { fmtPct, fmtNum } from "@/lib/sala/format";
import { WidgetShell } from "./widget-shell";
import type { SalaWidgetProps } from "./types";

export function WidgetBenchmark(_props: SalaWidgetProps) {
  const twr = usePatrimonioStore((s) => s.getTWR());
  const data = useDashboardStore((s) => s.data);
  const cspx = data?.marketData.cspxChangePct ?? null;

  return (
    <WidgetShell title="Patrimonio · vs Índices" accent={MODULE_HEX.patrimonio}>
      <div className="flex h-full flex-col justify-center gap-2">
        <Row label="CARTERA (TWR)" value={fmtPct(twr)} tone={twr !== null && twr >= 0 ? "gain" : "loss"} />
        <Row
          label="S&P 500 (CSPX) HOY"
          value={fmtPct(cspx)}
          tone={cspx !== null && cspx >= 0 ? "gain" : "loss"}
        />
        <Row
          label="CSPX PRECIO"
          value={
            data?.marketData.cspxPrice !== null && data?.marketData.cspxPrice !== undefined
              ? `${fmtNum(data.marketData.cspxPrice, 1)} €`
              : "—"
          }
        />
      </div>
    </WidgetShell>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="flex items-center justify-between rounded border border-[var(--sala-border)] bg-[var(--sala-surface)] px-2 py-1.5">
      <span className="font-mono text-[9px] tracking-[0.16em] text-[var(--sala-text-dim)]">
        {label}
      </span>
      <span
        className="financial-number text-sm"
        style={{
          color:
            tone === "gain"
              ? "var(--sala-gain)"
              : tone === "loss"
                ? "var(--sala-loss)"
                : "var(--sala-text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
