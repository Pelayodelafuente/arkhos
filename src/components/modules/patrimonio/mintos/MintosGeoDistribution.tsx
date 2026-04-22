"use client";

import { MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MintosDistribution } from "@/types/mintos";

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

// Emoji flags for common country codes / names
const FLAG_MAP: Record<string, string> = {
  españa: "🇪🇸",
  letonia: "🇱🇻",
  lituania: "🇱🇹",
  estonia: "🇪🇪",
  polonia: "🇵🇱",
  rumanía: "🇷🇴",
  rumania: "🇷🇴",
  chequia: "🇨🇿",
  bulgaria: "🇧🇬",
  kazajistán: "🇰🇿",
  kazajstan: "🇰🇿",
  mexico: "🇲🇽",
  méxico: "🇲🇽",
  indonesia: "🇮🇩",
  filipinas: "🇵🇭",
  vietnam: "🇻🇳",
  kenia: "🇰🇪",
  uganda: "🇺🇬",
  nigeria: "🇳🇬",
  finlandia: "🇫🇮",
  dinamarca: "🇩🇰",
  suecia: "🇸🇪",
  otros: "🌍",
  other: "🌍",
  "other countries": "🌍",
};

function getFlag(name: string): string {
  const key = name.toLowerCase().trim();
  return FLAG_MAP[key] ?? "🌍";
}

interface MintosGeoDistributionProps {
  items: MintosDistribution[];
}

export function MintosGeoDistribution({ items }: MintosGeoDistributionProps) {
  const filtered = items.filter((i) => i.amount > 0);
  const maxAmount = filtered.length > 0 ? Math.max(...filtered.map((i) => i.amount)) : 0;

  if (filtered.length === 0) {
    return (
      <div
        className="rounded-xl p-6 space-y-3"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <div className="flex items-center gap-2">
          <MapPin size={16} strokeWidth={1.5} style={{ color: "var(--platform-mintos)" }} aria-hidden="true" />
          <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
            Distribución Geográfica
          </h3>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sin datos geográficos disponibles.
        </p>
        <div
          className="rounded-lg p-3 text-xs space-y-0.5"
          style={{
            backgroundColor: "color-mix(in srgb, var(--platform-mintos) 6%, transparent)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.2))",
          }}
        >
          <p className="font-medium" style={{ color: "var(--text-secondary)" }}>
            Como actualizar:
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            Mintos → Estadísticas → distribución por país → actualizar datos manualmente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="flex items-center gap-2">
        <MapPin size={16} strokeWidth={1.5} style={{ color: "var(--platform-mintos)" }} aria-hidden="true" />
        <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          Distribución Geográfica
        </h3>
      </div>

      <div className="space-y-2.5">
        {filtered.map((item) => {
          const barWidth = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          return (
            <div key={item.category} className="space-y-1">
              <div className="flex items-center gap-3">
                {/* Flag emoji */}
                <span className="text-base w-6 flex-shrink-0" aria-hidden="true">
                  {getFlag(item.category)}
                </span>
                {/* Country name */}
                <span className="flex-1 text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                  {item.category}
                </span>
                {/* Amount */}
                <span className="font-mono text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {fmt(item.amount)}
                </span>
                {/* Percentage */}
                {item.percentage !== null && (
                  <span
                    className="font-mono text-xs tabular-nums w-12 text-right"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              {/* Progress bar */}
              <div
                className="ml-9 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "color-mix(in srgb, var(--platform-mintos) 12%, transparent)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: "var(--platform-mintos)",
                  }}
                  aria-label={`${barWidth.toFixed(0)}% del máximo`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Workflow note */}
      <div
        className="rounded-lg p-3 text-xs"
        style={{
          backgroundColor: "color-mix(in srgb, var(--platform-mintos) 6%, transparent)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.15))",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>
          Actualizar mensualmente desde Mintos → Estadísticas → distribución geográfica
        </span>
      </div>
    </div>
  );
}
