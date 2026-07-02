"use client";

// Top movers — mejores y peores posiciones por P&L %

import { useMemo } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { MODULE_HEX } from "@/lib/sala/palette";
import { fmtPct } from "@/lib/sala/format";
import { WidgetShell } from "./widget-shell";
import type { SalaWidgetProps } from "./types";
import type { PortfolioAsset } from "@/types/patrimonio";

export function WidgetTopMovers({ height }: SalaWidgetProps) {
  const perSide = Math.max(2, Math.floor((height - 8) / 52));
  const getTopGainers = usePatrimonioStore((s) => s.getTopGainers);
  const getTopLosers = usePatrimonioStore((s) => s.getTopLosers);
  const assets = usePatrimonioStore((s) => s.assets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gainers = useMemo(() => getTopGainers(perSide), [assets, perSide, getTopGainers]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const losers = useMemo(() => getTopLosers(perSide), [assets, perSide, getTopLosers]);

  return (
    <WidgetShell title="Patrimonio · Top movers" accent={MODULE_HEX.patrimonio}>
      <div className="grid h-full grid-cols-2 gap-3">
        <MoverList assets={gainers} tone="gain" />
        <MoverList assets={losers} tone="loss" />
      </div>
    </WidgetShell>
  );
}

function MoverList({ assets, tone }: { assets: PortfolioAsset[]; tone: "gain" | "loss" }) {
  return (
    <ul className="min-w-0 space-y-1.5">
      {assets.map((asset) => (
        <li key={asset.id} className="flex items-center gap-2 font-mono text-[10px]">
          <span className="truncate text-[var(--sala-text-dim)]">
            {asset.ticker ?? asset.name}
          </span>
          <span
            className="financial-number ml-auto shrink-0"
            style={{ color: tone === "gain" ? "var(--sala-gain)" : "var(--sala-loss)" }}
          >
            {fmtPct(asset.pl_percentage ?? null)}
          </span>
        </li>
      ))}
      {assets.length === 0 && (
        <li className="font-mono text-[10px] text-[var(--sala-text-dim)]">—</li>
      )}
    </ul>
  );
}
