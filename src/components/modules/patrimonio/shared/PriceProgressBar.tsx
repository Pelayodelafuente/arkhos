"use client";

import { Tooltip } from "@/components/ui";

interface PriceProgressBarProps {
  avgBuyPrice: number;
  currentPrice: number;
  className?: string;
}

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function PriceProgressBar({ avgBuyPrice, currentPrice, className = "" }: PriceProgressBarProps) {
  if (!currentPrice || currentPrice <= 0) return null;

  const isPositive = currentPrice >= avgBuyPrice;
  const fillColor = isPositive ? "#2E7D6B" : "#A32D2D";
  const bgColor = isPositive ? "#2E7D6B1A" : "#A32D2D1A";

  // Fill: ratio de 0-100%, máx 100%
  const ratio = avgBuyPrice > 0 ? Math.min((currentPrice / avgBuyPrice) / 2, 1) : 0.5;
  const fillPercent = ratio * 100;

  const tooltipText = `Compraste a ${fmt.format(avgBuyPrice)} de media · Ahora vale ${fmt.format(currentPrice)}`;

  return (
    <Tooltip content={tooltipText}>
      <div
        className={`relative h-1.5 overflow-hidden rounded-full ${className}`}
        style={{ width: 80, background: bgColor }}
        role="meter"
        aria-valuenow={fillPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={tooltipText}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${fillPercent}%`,
            background: fillColor,
          }}
        />
      </div>
    </Tooltip>
  );
}
