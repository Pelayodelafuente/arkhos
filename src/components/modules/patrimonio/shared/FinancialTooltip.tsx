"use client";

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

interface FinancialTooltipProps {
  active?: boolean;
  title: string;
  subtitle?: string;
  rows: TooltipRow[];
}

export function FinancialTooltip({ active, title, subtitle, rows }: FinancialTooltipProps) {
  if (!active) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        minWidth: 160,
      }}
    >
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>{title}</p>
      {subtitle && (
        <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-tertiary)" }}>{subtitle}</p>
      )}
      {rows.length > 0 && (
        <div
          className="mt-2 space-y-1"
          style={{ borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.15))", paddingTop: "6px" }}
        >
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <span style={{ color: "var(--text-tertiary)" }}>{row.label}</span>
              <span
                className="font-mono font-medium tabular-nums"
                style={{ color: row.color ?? "var(--text-primary)" }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
