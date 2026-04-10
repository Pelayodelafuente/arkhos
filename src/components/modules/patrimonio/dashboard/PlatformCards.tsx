"use client";

import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { PLBadge } from "@/components/modules/patrimonio/shared/PLBadge";
import type { PlatformSlug } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

export function PlatformCards() {
  const overview = usePatrimonioStore((s) => s.overview);
  const activePlatform = usePatrimonioStore((s) => s.activePlatform);
  const setActivePlatform = usePatrimonioStore((s) => s.setActivePlatform);

  if (!overview) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {overview.platforms.map((ps) => {
        const isActive = activePlatform === ps.platform.slug;
        return (
          <button
            key={ps.platform.id}
            type="button"
            onClick={() => setActivePlatform(ps.platform.slug as PlatformSlug)}
            className="rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:scale-[1.01]"
            style={{
              borderColor: isActive ? ps.platform.color : "var(--border)",
              boxShadow: isActive ? `0 0 0 2px ${ps.platform.color}30` : "none",
              cursor: "pointer",
            }}
            aria-pressed={isActive}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: ps.platform.color }}
                aria-hidden="true"
              />
              <span className="truncate text-sm font-medium text-foreground">
                {ps.platform.name}
              </span>
            </div>
            <p className="mt-3 font-mono text-lg font-semibold text-foreground">
              {formatEur(ps.total_value)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-text-tertiary">
                {formatEur(ps.total_invested)} inv.
              </span>
            </div>
            <div className="mt-2">
              <PLBadge amount={ps.pl_amount} percentage={ps.pl_percentage} showPercentage />
            </div>
          </button>
        );
      })}
    </div>
  );
}
