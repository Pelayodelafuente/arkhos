"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

import { formatEur } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Platform config (hex values son parte de la config, no del JSX)
// ---------------------------------------------------------------------------

interface PlatformConfigEntry {
  slug: string;
  name: string;
  color: string;
}

const PLATFORM_CONFIG: PlatformConfigEntry[] = [
  { slug: "trade-republic", name: "Trade Republic", color: "#2E7D6B" },
  { slug: "indexa",         name: "Indexa Capital", color: "#3B78B0" },
  { slug: "horos",          name: "Horos",          color: "#7260C4" },
  { slug: "mintos",         name: "Mintos",         color: "#C4704A" },
  { slug: "crypto",         name: "Cripto",         color: "#B07A3A" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlatformSegment {
  slug: string;
  name: string;
  value: number;
  color: string;
  plAmount: number | null;
  plPct: number | null;
}

// ---------------------------------------------------------------------------
// PlatformDistributionBar
// ---------------------------------------------------------------------------

export function PlatformDistributionBar() {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const setActivePlatform = usePatrimonioStore((s) => s.setActivePlatform);

  // ── Trade Republic ──────────────────────────────────────────────────────
  const trAssets = usePatrimonioStore((s) => s.assets);
  const trPlatforms = usePatrimonioStore((s) => s.platforms);
  const trOverview = usePatrimonioStore((s) => s.overview);

  // ── Indexa ───────────────────────────────────────────────────────────────
  const indexaOverview = useIndexaStore((s) => s.overview);

  // ── Horos ────────────────────────────────────────────────────────────────
  const horosPosition = useHorosStore((s) => s.position);

  // ── Crypto ───────────────────────────────────────────────────────────────
  const cryptoRawAssets = useCryptoStore((s) => s.assets);
  const cryptoRawDefi = useCryptoStore((s) => s.defiPositions);
  const getCryptoOverview = useCryptoStore((s) => s.getOverview);
  // Las deps extra son triggers: el getter lee get() internamente y debe recomputar al cambiar el store
  const cryptoOverview = useMemo(() => {
    void cryptoRawAssets; void cryptoRawDefi
    return getCryptoOverview()
  }, [cryptoRawAssets, cryptoRawDefi, getCryptoOverview]);

  // ── Mintos ───────────────────────────────────────────────────────────────
  const mintosOverview = useMintosStore((s) => s.overview);
  const mintosDeposits = useMintosStore((s) => s.deposits);
  const mintosInvested = useMemo(
    () => mintosDeposits.reduce((s, d) => s + d.amount, 0),
    [mintosDeposits]
  );

  // ── Build segments ────────────────────────────────────────────────────────
  const segments = useMemo((): PlatformSegment[] => {
    return PLATFORM_CONFIG.map((cfg) => {
      if (cfg.slug === "trade-republic") {
        // Solo carteraInvertida — el efectivo se muestra en la card como sub-badge
        const platform = trPlatforms.find((p) => p.slug === "trade-republic");
        const value = platform
          ? trAssets
              .filter((a) => a.platform_id === platform.id && a.category !== "cash")
              .reduce((s, a) => s + (a.current_value ?? 0), 0)
          : 0;
        const plAmount = trOverview?.pl_amount ?? null;
        const trInvested = trOverview
          ? trOverview.total_invested - trOverview.total_cash
          : 0;
        const plPct =
          trInvested > 0 && plAmount !== null
            ? (plAmount / trInvested) * 100
            : null;
        return { slug: cfg.slug, name: cfg.name, value, color: cfg.color, plAmount, plPct };
      }

      if (cfg.slug === "indexa") {
        const value = indexaOverview?.total_value ?? 0;
        const plAmount = indexaOverview?.total_gain ?? null;
        const plPct = indexaOverview?.total_gain_pct ?? null;
        return { slug: cfg.slug, name: cfg.name, value, color: cfg.color, plAmount, plPct };
      }

      if (cfg.slug === "horos") {
        const value = horosPosition?.total_value ?? 0;
        const plAmount = horosPosition?.unrealized_gain ?? null;
        const plPct = horosPosition?.unrealized_gain_pct ?? null;
        return { slug: cfg.slug, name: cfg.name, value, color: cfg.color, plAmount, plPct };
      }

      if (cfg.slug === "mintos") {
        const value = mintosOverview?.total_value ?? 0;
        const plAmount = mintosOverview?.net_gain ?? null;
        const plPct =
          mintosInvested > 0 && plAmount !== null
            ? (plAmount / mintosInvested) * 100
            : null;
        return { slug: cfg.slug, name: cfg.name, value, color: cfg.color, plAmount, plPct };
      }

      if (cfg.slug === "crypto") {
        const value = cryptoOverview?.total_value_eur ?? 0;
        const plAmount = cryptoOverview?.pl_eur ?? null;
        const plPct = cryptoOverview?.pl_pct ?? null;
        return { slug: cfg.slug, name: cfg.name, value, color: cfg.color, plAmount, plPct };
      }

      return { slug: cfg.slug, name: cfg.name, value: 0, color: cfg.color, plAmount: null, plPct: null };
    }).filter((s) => s.value > 0);
  }, [
    trAssets,
    trPlatforms,
    trOverview,
    indexaOverview,
    horosPosition,
    cryptoOverview,
    mintosOverview,
    mintosInvested,
  ]);

  const totalValue = useMemo(() => segments.reduce((s, seg) => s + seg.value, 0), [segments]);

  if (segments.length === 0 || totalValue === 0) {
    return (
      <div
        className="flex h-full min-h-[280px] items-center justify-center rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sin datos de distribución
        </p>
      </div>
    );
  }

  const hoveredSeg = hoveredSlug ? (segments.find((s) => s.slug === hoveredSlug) ?? null) : null;

  return (
    <div
      className="rounded-xl overflow-hidden p-5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
        Distribución por plataforma
      </p>

      <div className="space-y-3">
        {segments.map((seg, idx) => {
          const pct = totalValue > 0 ? (seg.value / totalValue) * 100 : 0;
          const isHovered = hoveredSlug === seg.slug;

          return (
            <div
              key={seg.slug}
              className="group cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${seg.name}: ${pct.toFixed(1)}%, ${formatEur(seg.value)}`}
              onClick={() => setActivePlatform(seg.slug as Parameters<typeof setActivePlatform>[0])}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActivePlatform(seg.slug as Parameters<typeof setActivePlatform>[0]);
                }
              }}
              onMouseEnter={() => setHoveredSlug(seg.slug)}
              onMouseLeave={() => setHoveredSlug(null)}
            >
              {/* Label row */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-medium transition-colors duration-150"
                  style={{ color: isHovered ? seg.color : "var(--text-secondary)" }}
                >
                  {seg.name}
                </span>
                <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                  {pct.toFixed(1)}% · {formatEur(seg.value)}
                </span>
              </div>

              {/* Bar */}
              <div
                className="relative h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--bg-sand, rgba(160,120,80,0.1))" }}
              >
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    backgroundColor: seg.color,
                    opacity: isHovered ? 1 : 0.75,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    duration: 0.7,
                    delay: 0.1 * idx,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip inline */}
      {hoveredSeg && (
        <motion.div
          key={hoveredSeg.slug}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="mt-3 rounded-lg p-3 text-xs"
          style={{
            backgroundColor: "var(--bg-sand, rgba(160,120,80,0.08))",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.2))",
          }}
        >
          <p className="font-medium" style={{ color: hoveredSeg.color }}>
            {hoveredSeg.name}
          </p>
          <p className="font-mono mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {formatEur(hoveredSeg.value)} ·{" "}
            {((hoveredSeg.value / totalValue) * 100).toFixed(1)}%
          </p>
          {hoveredSeg.plAmount !== null && hoveredSeg.plAmount !== undefined && (
            <p
              className="font-mono mt-0.5"
              style={{
                color:
                  hoveredSeg.plAmount >= 0 ? "var(--color-gain)" : "var(--color-loss)",
              }}
            >
              {hoveredSeg.plAmount >= 0 ? "+" : ""}
              {formatEur(hoveredSeg.plAmount)}
              {hoveredSeg.plPct !== null && hoveredSeg.plPct !== undefined
                ? ` · ${hoveredSeg.plPct >= 0 ? "+" : ""}${hoveredSeg.plPct.toFixed(2)}%`
                : ""}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
