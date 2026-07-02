"use client";

// Pulso de mercados — marketData de la megacarga (BTC, ETH, F&G, VIX...)

import { useDashboardStore } from "@/stores/dashboard-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { fmtNum } from "@/lib/sala/format";
import { WidgetShell } from "./widget-shell";
import type { SalaWidgetProps } from "./types";

interface Tile {
  label: string;
  value: string;
  change?: number | null;
  suffix?: string;
}

export function WidgetMercados(_props: SalaWidgetProps) {
  const data = useDashboardStore((s) => s.data);
  const m = data?.marketData;

  const tiles: Tile[] = [
    {
      label: "BTC",
      value: data?.btcPrice !== null && data?.btcPrice !== undefined ? `${fmtNum(data.btcPrice, 0)} €` : "—",
      change: m?.btcChange24h,
    },
    {
      label: "ETH",
      value: m?.ethPrice !== null && m?.ethPrice !== undefined ? `${fmtNum(m.ethPrice, 0)} €` : "—",
      change: m?.ethChange24h,
    },
    {
      label: "FEAR&GREED",
      value: m?.fearGreed ? `${m.fearGreed.value}` : "—",
      suffix: m?.fearGreed?.label,
    },
    { label: "VIX", value: fmtNum(m?.vix, 1) },
    { label: "US 10Y", value: m?.us10y !== null && m?.us10y !== undefined ? `${fmtNum(m.us10y, 2)}%` : "—" },
    { label: "EUR/USD", value: fmtNum(m?.eurUsd, 3) },
    { label: "DXY", value: fmtNum(m?.dxy, 1) },
    { label: "ORO", value: m?.gold !== null && m?.gold !== undefined ? `${fmtNum(m.gold, 0)} $` : "—" },
    { label: "CSPX", value: m?.cspxPrice !== null && m?.cspxPrice !== undefined ? `${fmtNum(m.cspxPrice, 1)} €` : "—", change: m?.cspxChangePct },
    { label: "IGLN", value: m?.iglnPrice !== null && m?.iglnPrice !== undefined ? `${fmtNum(m.iglnPrice, 1)} €` : "—", change: m?.iglnChangePct },
  ];

  return (
    <WidgetShell title="Mercados · Pulso global" accent={MODULE_HEX.mercados}>
      <div className="grid h-full grid-cols-5 grid-rows-2 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col justify-center rounded border border-[var(--sala-border)] bg-[var(--sala-surface)] px-2"
          >
            <span className="truncate font-mono text-[9px] tracking-[0.14em] text-[var(--sala-text-dim)]">
              {tile.label}
            </span>
            <span className="financial-number truncate text-[13px] text-[var(--sala-text)]">
              {tile.value}
            </span>
            {tile.change !== undefined && tile.change !== null && (
              <span
                className="font-mono text-[9px]"
                style={{ color: tile.change >= 0 ? "var(--sala-gain)" : "var(--sala-loss)" }}
              >
                {tile.change >= 0 ? "+" : ""}
                {tile.change.toFixed(1)}%
              </span>
            )}
            {tile.suffix && (
              <span className="truncate font-mono text-[9px] text-[var(--sala-text-dim)]">
                {tile.suffix}
              </span>
            )}
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
