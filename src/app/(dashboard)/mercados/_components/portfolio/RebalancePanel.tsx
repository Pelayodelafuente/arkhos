"use client";

import type { RebalanceAlert } from "@/lib/mercados/portfolio-market";

interface Props {
  alerts: RebalanceAlert[];
  isLoading: boolean;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl border border-border bg-card animate-pulse ${className}`} />;
}

const SEVERITY_STYLES: Record<RebalanceAlert["severity"], string> = {
  critical: "bg-red-50 border-red-200 text-red-700",
  warning:  "bg-amber-50 border-amber-200 text-amber-700",
  info:     "bg-blue-50 border-blue-200 text-blue-700",
};

const SEVERITY_DOT: Record<RebalanceAlert["severity"], string> = {
  critical: "bg-red-500",
  warning:  "bg-amber-500",
  info:     "bg-blue-500",
};

export function RebalancePanel({ alerts, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-4">
        Sugerencias de rebalanceo
      </p>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 mb-3">
            <span className="text-green-600 text-lg">✓</span>
          </div>
          <p className="text-sm font-medium text-foreground">Cartera bien equilibrada</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Todas las clases están dentro del rango objetivo (±3%)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.assetClass}
              className={`rounded-lg border p-3 ${SEVERITY_STYLES[alert.severity]}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${SEVERITY_DOT[alert.severity]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{alert.assetClass}</p>
                  <p className="text-[11px] mt-0.5 opacity-80">
                    Actual: {alert.currentPct}% · Objetivo: {alert.targetPct}% · Desv:{" "}
                    {alert.deviation > 0 ? "+" : ""}
                    {alert.deviation}%
                  </p>
                  <p className="text-[11px] mt-1 leading-snug">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
