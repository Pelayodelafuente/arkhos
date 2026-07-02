"use client";

// ══════════════════════════════════════
// Arkhos OPS — carcasa común de widget (superficie FUI)
// ══════════════════════════════════════

import type { ReactNode } from "react";

interface WidgetShellProps {
  title: string;
  accent: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function WidgetShell({ title, accent, headerRight, children }: WidgetShellProps) {
  return (
    <div className="sala-screen flex flex-col">
      <header className="flex h-[30px] shrink-0 items-center gap-2 border-b border-[var(--sala-border)] px-3">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--sala-text-dim)]">
          {title}
        </span>
        {headerRight !== undefined && <span className="ml-auto">{headerRight}</span>}
      </header>
      <div className="relative min-h-0 flex-1 p-3">{children}</div>
    </div>
  );
}

/** Chip de variación con color financiero */
export function DeltaChip({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) return null;
  const positive = value >= 0;
  return (
    <span
      className="rounded-sm px-1.5 py-0.5 font-mono text-[10px]"
      style={{
        color: positive ? "var(--sala-gain)" : "var(--sala-loss)",
        backgroundColor: positive ? "var(--sala-gain-bg)" : "var(--sala-loss-bg)",
      }}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}
