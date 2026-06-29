"use client";

import { useId } from "react";
import { useAnimatedCounter } from "@/lib/hooks/use-animated-counter";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { Sparkline } from "./Sparkline";

/**
 * Tarjeta de métrica única unificada (Fase 3.1).
 *
 * - `value` es el string ya formateado (display por defecto y en reduced-motion).
 * - Para count-up real, pasar `numericValue` + `format`: se anima el número y se
 *   formatea (respetando `prefers-reduced-motion`).
 * - `trend` dibuja un <Sparkline> de fondo (modo área, tenue).
 */
interface KPICardProps {
  label: string;
  value: string;
  /** Número objetivo para el contador animado (opcional). */
  numericValue?: number | null;
  /** Formateador del número animado → string. Requerido para animar. */
  format?: (n: number) => string;
  delta?: string;
  deltaLabel?: string;
  deltaColor?: string;
  trend?: number[];
  trendColor?: string;
  valueColor?: string;
  description?: string;
  animated?: boolean;
  className?: string;
}

export function KPICard({
  label,
  value,
  numericValue,
  format,
  delta,
  deltaLabel,
  deltaColor,
  trend,
  trendColor = "var(--color-success)",
  valueColor,
  description,
  animated = true,
  className = "",
}: KPICardProps) {
  const reduced = usePrefersReducedMotion();
  const canAnimate =
    animated && !reduced && numericValue != null && typeof format === "function";

  // useAnimatedCounter no arranca RAF si el target es 0; cuando no animamos pasamos 0
  // y mostramos `value` directamente.
  const animatedN = useAnimatedCounter(canAnimate ? (numericValue as number) : 0);
  const display = canAnimate ? (format as (n: number) => string)(animatedN) : value;

  const descId = useId();

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-card p-4 ${className}`}
      title={description}
      aria-describedby={description ? descId : undefined}
    >
      {trend && trend.length >= 2 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12" aria-hidden="true">
          <Sparkline
            values={trend}
            color={trendColor}
            mode="area"
            width={200}
            height={48}
            opacity={0.18}
            className="h-full w-full"
          />
        </div>
      )}

      <p
        className="relative text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className="relative mt-1.5 font-mono text-2xl font-semibold tabular-nums leading-none"
        style={{ color: valueColor ?? "var(--text-primary)" }}
      >
        {display}
      </p>
      {delta && (
        <p className="relative mt-1.5 font-mono text-xs">
          <span style={{ color: deltaColor ?? "var(--text-secondary)" }}>{delta}</span>
          {deltaLabel && (
            <span className="ml-1" style={{ color: "var(--text-tertiary)" }}>
              {deltaLabel}
            </span>
          )}
        </p>
      )}

      {description && (
        <span id={descId} className="sr-only">
          {description}
        </span>
      )}
    </div>
  );
}
