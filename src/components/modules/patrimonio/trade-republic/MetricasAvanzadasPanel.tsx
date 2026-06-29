"use client";

import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { C } from "@/lib/patrimonio/chart-colors";
import { formatPct } from "@/lib/utils/format";
import { KPICard } from "@/components/viz";

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtFixed(v: number | null, decimals = 2): string | null {
  if (v === null) return null;
  return v.toFixed(decimals);
}

// ─── Semaphore helpers ───────────────────────────────────────────────────────

function volColor(vol: number | null): string {
  if (vol === null) return C.gray;
  const pct = vol * 100;
  if (pct < 10) return C.green;
  if (pct < 20) return C.amber;
  return C.red;
}

function sharpeLabel(s: number | null): { badge: string; color: string } | undefined {
  if (s === null) return undefined;
  if (s > 1.5) return { badge: "Excelente", color: C.green };
  if (s > 1.0) return { badge: "Bueno", color: C.green };
  if (s > 0.5) return { badge: "Aceptable", color: C.amber };
  if (s > 0) return { badge: "Bajo", color: C.red };
  return { badge: "Negativo", color: C.red };
}

function sharpeColor(s: number | null): string {
  if (s === null) return C.gray;
  if (s > 1.0) return C.green;
  if (s > 0.5) return C.amber;
  return C.red;
}

// ─── Panel ──────────────────────────────────────────────────────────────────

export function MetricasAvanzadasPanel() {
  const getTWR = usePatrimonioStore((s) => s.getTWR);
  const getCAGR = usePatrimonioStore((s) => s.getCAGR);
  const getAnnualizedVolatility = usePatrimonioStore((s) => s.getAnnualizedVolatility);
  const getSharpeRatio = usePatrimonioStore((s) => s.getSharpeRatio);
  const getMaxDrawdown = usePatrimonioStore((s) => s.getMaxDrawdown);
  const snapshots = usePatrimonioStore((s) => s.snapshots);

  const twr = getTWR();
  const cagr = getCAGR();
  const vol = getAnnualizedVolatility();
  const sharpe = getSharpeRatio();
  const maxDrawdown = getMaxDrawdown(); // ya en % (≤ 0)

  const sharpeMeta = sharpeLabel(sharpe);

  const cagrPeriod = (() => {
    if (snapshots.length < 2) return null;
    const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const first = new Date(sorted[0].snapshot_date);
    const last = new Date(sorted[sorted.length - 1].snapshot_date);
    const days = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
    const years = days / 365.25;
    const firstLabel = first.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
    const lastLabel = last.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
    return `${firstLabel} → ${lastLabel} · ${years.toFixed(1)} años`;
  })();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Métricas avanzadas</h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Rentabilidad ajustada al riesgo · Tasa libre de riesgo: 3% (Euribor)
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label="TWR total"
          value={twr !== null ? formatPct(twr * 100, true, 1) : "—"}
          numericValue={twr !== null ? twr * 100 : null}
          format={(n) => formatPct(n, true, 1)}
          valueColor={twr !== null ? (twr >= 0 ? C.green : C.red) : undefined}
          description="Time-Weighted Return desde inicio"
        />
        <KPICard
          label="CAGR"
          value={cagr !== null ? formatPct(cagr * 100, true, 1) : "—"}
          numericValue={cagr !== null ? cagr * 100 : null}
          format={(n) => formatPct(n, true, 1)}
          valueColor={cagr !== null ? (cagr >= 0 ? C.green : C.red) : undefined}
          description={cagrPeriod ?? "Rentabilidad anualizada compuesta"}
        />
        <KPICard
          label="Volatilidad"
          value={vol !== null ? formatPct(vol * 100, false, 1) : "—"}
          numericValue={vol !== null ? vol * 100 : null}
          format={(n) => formatPct(n, false, 1)}
          valueColor={volColor(vol)}
          description="Desviación estándar anualizada"
        />
        <KPICard
          label="Sharpe"
          value={fmtFixed(sharpe) ?? "—"}
          numericValue={sharpe}
          format={(n) => n.toFixed(2)}
          valueColor={sharpeColor(sharpe)}
          description={`Retorno ajustado al riesgo vs 3% RF${sharpeMeta ? ` · ${sharpeMeta.badge}` : ""}`}
        />
        <KPICard
          label="Max Drawdown"
          value={maxDrawdown !== null ? formatPct(maxDrawdown, true) : "—"}
          numericValue={maxDrawdown}
          format={(n) => formatPct(n, true)}
          valueColor={maxDrawdown !== null && maxDrawdown < 0 ? C.red : undefined}
          description="Caída máxima desde máximo histórico (curva TWR)"
        />
      </div>
    </div>
  );
}
