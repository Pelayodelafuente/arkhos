"use client";

// ══════════════════════════════════════
// Arkhos OPS — ticker de mercados
// Cinta luminosa sobre la fila hero con las cotizaciones reales de la
// megacarga en scroll continuo (contenido triplicado para el loop de
// ticker-scroll; reduced-motion lo detiene vía globals.css).
// ══════════════════════════════════════

import { Html } from "@react-three/drei";
import { useDashboardStore } from "@/stores/dashboard-store";
import { fmtNum } from "@/lib/sala/format";
import { WALL_ARC } from "@/lib/sala/config";
import { SALA_COLORS } from "@/lib/sala/palette";

interface TickerItem {
  label: string;
  value: string;
  change?: number | null;
}

export function MarketTicker() {
  const data = useDashboardStore((s) => s.data);
  const m = data?.marketData;

  const items: TickerItem[] = [
    { label: "BTC", value: data?.btcPrice ? `${fmtNum(data.btcPrice, 0)} €` : "—", change: m?.btcChange24h },
    { label: "ETH", value: m?.ethPrice ? `${fmtNum(m.ethPrice, 0)} €` : "—", change: m?.ethChange24h },
    { label: "VIX", value: fmtNum(m?.vix, 1) },
    { label: "US10Y", value: m?.us10y ? `${fmtNum(m.us10y, 2)}%` : "—" },
    { label: "EUR/USD", value: fmtNum(m?.eurUsd, 3) },
    { label: "DXY", value: fmtNum(m?.dxy, 1) },
    { label: "ORO", value: m?.gold ? `${fmtNum(m.gold, 0)} $` : "—" },
    { label: "CSPX", value: m?.cspxPrice ? `${fmtNum(m.cspxPrice, 1)} €` : "—", change: m?.cspxChangePct },
    { label: "IGLN", value: m?.iglnPrice ? `${fmtNum(m.iglnPrice, 1)} €` : "—", change: m?.iglnChangePct },
    { label: "F&G", value: m?.fearGreed ? `${m.fearGreed.value} ${m.fearGreed.label}` : "—" },
  ];

  // Triplicado: ticker-scroll desplaza -33.333%
  const loop = [...items, ...items, ...items];

  return (
    <group position={[0, 3.42, WALL_ARC.cz - WALL_ARC.radius + 0.3]}>
      <Html
        transform
        distanceFactor={400 / 300}
        zIndexRange={[3, 0]}
        style={{ width: 1860, height: 44 }}
      >
        <div className="flex h-[44px] w-[1860px] select-none items-center overflow-hidden border-y border-[var(--sala-border)] bg-[rgba(7,7,13,0.85)]">
          <div className="animate-ticker flex w-max items-center">
            {loop.map((item, i) => (
              <span key={i} className="flex items-center gap-2 whitespace-nowrap px-6 font-mono text-[13px]">
                <span className="tracking-[0.2em] text-[var(--sala-text-dim)]">{item.label}</span>
                <span className="financial-number text-[var(--sala-text)]">{item.value}</span>
                {item.change !== undefined && item.change !== null && (
                  <span
                    style={{ color: item.change >= 0 ? "var(--sala-gain)" : "var(--sala-loss)" }}
                  >
                    {item.change >= 0 ? "▲" : "▼"} {Math.abs(item.change).toFixed(1)}%
                  </span>
                )}
                <span className="pl-4 text-[var(--sala-border)]">·</span>
              </span>
            ))}
          </div>
        </div>
      </Html>
      {/* Rieles luminosos de la cinta */}
      <mesh position={[0, 0.085, 0]}>
        <boxGeometry args={[6.3, 0.012, 0.012]} />
        <meshStandardMaterial
          color={SALA_COLORS.screenOff}
          emissive={SALA_COLORS.copper}
          emissiveIntensity={1.6}
        />
      </mesh>
      <mesh position={[0, -0.085, 0]}>
        <boxGeometry args={[6.3, 0.012, 0.012]} />
        <meshStandardMaterial
          color={SALA_COLORS.screenOff}
          emissive={SALA_COLORS.copper}
          emissiveIntensity={1.6}
        />
      </mesh>
    </group>
  );
}
