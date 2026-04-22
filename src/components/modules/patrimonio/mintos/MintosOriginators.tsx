"use client";

import { formatCurrency } from "@/lib/utils/format";
import type { MintosDistribution } from "@/types/mintos";

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

interface MintosOriginatorsProps {
  items: MintosDistribution[];
}

export function MintosOriginators({ items }: MintosOriginatorsProps) {
  const filtered = items.filter((i) => i.amount > 0);
  const maxAmount = filtered.length > 0 ? Math.max(...filtered.map((i) => i.amount)) : 0;
  const totalAmount = filtered.reduce((s, i) => s + i.amount, 0);
  const topConcentration =
    filtered.length > 0 && totalAmount > 0
      ? ((filtered[0].amount / totalAmount) * 100).toFixed(1)
      : null;

  if (filtered.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sin datos de originadores. Actualiza desde Mintos.
        </p>
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
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          Originadores
        </h3>
        {topConcentration !== null && (
          <div className="text-right">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Concentración máxima
            </span>
            <p
              className="font-mono text-sm font-semibold tabular-nums"
              style={{ color: parseFloat(topConcentration) > 25 ? "#C8A84B" : "var(--text-primary)" }}
            >
              {topConcentration}%
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {filtered.map((item) => {
          const barWidth = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          const pct = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;

          return (
            <div key={item.category} className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                  {item.category}
                </span>
                {item.loan_count !== null && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.loan_count} préstamos
                  </span>
                )}
                <span className="font-mono text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {fmt(item.amount)}
                </span>
                <span
                  className="font-mono text-xs tabular-nums w-12 text-right"
                  style={{ color: "var(--text-muted)" }}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>
              {/* Proportional bar */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "color-mix(in srgb, var(--platform-mintos) 12%, transparent)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: "var(--platform-mintos)",
                    opacity: pct > 25 ? 1 : 0.7,
                  }}
                  aria-label={`${barWidth.toFixed(0)}% del máximo`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
