"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PlatformSlug } from "@/types/patrimonio";
import { PLBadge } from "@/components/modules/patrimonio/shared/PLBadge";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

export interface PlatformCardProps {
  slug: PlatformSlug;
  name: string;
  description: string;
  color: string;
  colorHex: string;
  icon: React.ReactNode;
  currentValue?: number | null;
  totalInvested?: number | null;
  plAmount?: number | null;
  plPercentage?: number | null;
  cashValue?: number | null;
  sparklineData?: number[];
  positionsCount?: number;
  lastUpdated?: string | null;
  isActive?: boolean;
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

function CardSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const isPositive = values[values.length - 1] >= values[0];
  const W = 56;
  const H = 22;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const strokeColor = isPositive ? color : "#A32D2D";
  return (
    <svg width={W} height={H} aria-hidden="true" className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Skeleton lines for pending platforms
// ---------------------------------------------------------------------------

function SkeletonLines() {
  return (
    <div className="space-y-2.5 py-3" aria-hidden="true">
      <div className="h-2 w-4/5 rounded-full" style={{ backgroundColor: "rgba(160,120,80,0.12)" }} />
      <div className="h-2 w-3/5 rounded-full" style={{ backgroundColor: "rgba(160,120,80,0.08)" }} />
      <div className="h-2 w-2/3 rounded-full" style={{ backgroundColor: "rgba(160,120,80,0.10)" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlatformCard
// ---------------------------------------------------------------------------

export function PlatformCard({
  name,
  description,
  color,
  colorHex,
  icon,
  currentValue,
  totalInvested,
  plAmount,
  plPercentage,
  cashValue,
  sparklineData,
  positionsCount,
  lastUpdated,
  isActive = false,
  onClick,
}: PlatformCardProps) {
  const hasData =
    currentValue !== null &&
    currentValue !== undefined &&
    totalInvested !== null &&
    totalInvested !== undefined;

  const updatedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{
        scale: 1.02,
        y: -4,
        boxShadow: `0 12px 40px ${colorHex}25`,
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as const }}
      className="relative w-full overflow-hidden rounded-xl p-4 text-left"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
      aria-label={`Plataforma ${name}${hasData ? `, ${formatEur(currentValue!)}` : ", pendiente de configuración"}`}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
              color,
            }}
            aria-hidden="true"
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          {hasData ? (
            <div className="flex items-center gap-1 text-xs font-medium" style={{ color }}>
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              ACTIVA
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">PENDIENTE</span>
          )}
        </div>
      </div>

      {/* Body */}
      {hasData ? (
        <div>
          <div className="flex items-end justify-between gap-2 mb-1.5">
            <p className="font-mono text-2xl font-semibold text-foreground tabular-nums">
              {formatEur(currentValue!)}
            </p>
            {sparklineData && sparklineData.length >= 2 && (
              <CardSparkline values={sparklineData} color={colorHex} />
            )}
          </div>

          {plAmount !== null && plAmount !== undefined && plPercentage !== null && plPercentage !== undefined && (
            <div className="flex items-center gap-2 flex-wrap">
              <PLBadge
                amount={plAmount}
                percentage={plPercentage}
                showAmount
                showPercentage
                size="sm"
              />
              {positionsCount !== undefined && positionsCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  <span className="font-mono">{positionsCount}</span> {positionsCount === 1 ? "posición" : "posiciones"}
                </span>
              )}
            </div>
          )}

          {cashValue !== null && cashValue !== undefined && cashValue > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  backgroundColor: "rgba(160,120,80,0.08)",
                  color: "var(--text-tertiary)",
                }}
              >
                Efectivo <span className="font-mono">{formatEur(cashValue)}</span>
              </span>
            </div>
          )}

          {updatedTime && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Actualizado {updatedTime}
            </p>
          )}
        </div>
      ) : (
        <div>
          <SkeletonLines />
          <div className="flex items-center gap-1 text-xs font-medium mt-1" style={{ color }}>
            Conectar plataforma
            <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Active platform highlight */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ border: `1.5px solid ${color}`, opacity: 0.4 }}
          aria-hidden="true"
        />
      )}
    </motion.button>
  );
}
