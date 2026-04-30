"use client";

import type { MacroData } from "@/lib/mercados/macro";
import { YieldCurveChart } from "./YieldCurveChart";
import { FedFundsChart } from "./FedFundsChart";
import { InflationChart } from "./InflationChart";
import { M2BitcoinChart } from "./M2BitcoinChart";
import { FedBalanceChart } from "./FedBalanceChart";

interface Props {
  data: MacroData | null;
  isLoading: boolean;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card animate-pulse ${className}`}
    />
  );
}

export function MacroDashboard({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="md:col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner curva invertida */}
      {data.yieldCurve.isInverted && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-lg" role="img" aria-label="Advertencia">
            ⚠
          </span>
          <p className="text-sm font-medium text-red-700">
            CURVA DE TIPOS INVERTIDA — Señal histórica de recesión en EE. UU.
          </p>
        </div>
      )}

      {/* Errores de fetch — solo en desarrollo */}
      {data.errors.length > 0 && process.env.NODE_ENV === "development" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
          <p className="text-xs text-amber-700">{data.errors.join(" · ")}</p>
        </div>
      )}

      {/* Fila 1: Yield Curve (2/3) + Fed Funds (1/3) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <YieldCurveChart data={data.yieldCurve} />
        </div>
        <div>
          <FedFundsChart data={data.fedFunds} />
        </div>
      </div>

      {/* Fila 2: Inflación (1/2) + Fed Balance (1/2) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InflationChart cpi={data.cpi} pce={data.pce} />
        <FedBalanceChart data={data.fedBalance} />
      </div>

      {/* Fila 3: M2 + Bitcoin (ancho completo) */}
      <M2BitcoinChart data={data.m2} />
    </div>
  );
}
