"use client";

import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { C } from "@/lib/patrimonio/chart-colors";

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtPct(v: number | null, sign = true): string | null {
  if (v === null) return null;
  const pct = (v * 100).toFixed(1);
  return sign && v >= 0 ? `+${pct}%` : `${pct}%`;
}

function fmtFixed(v: number | null, decimals = 2): string | null {
  if (v === null) return null;
  return v.toFixed(decimals);
}

// ─── Metric card ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | null;
  subtext: string;
  accentColor?: string;
  badge?: string;
  badgeColor?: string;
}

function MetricCard({ label, value, subtext, accentColor, badge, badgeColor }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
      {value === null ? (
        <p className="font-mono text-lg text-text-tertiary">—</p>
      ) : (
        <div className="flex items-baseline gap-2">
          <p
            className="font-mono text-xl font-semibold"
            style={{ color: accentColor ?? "var(--text-foreground)" }}
          >
            {value}
          </p>
          {badge && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${badgeColor ?? C.gray}20`,
                color: badgeColor ?? C.gray,
              }}
            >
              {badge}
            </span>
          )}
        </div>
      )}
      <p className="text-xs text-text-tertiary">{subtext}</p>
    </div>
  );
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

function drawdownColor(dd: number | null): string {
  if (dd === null) return C.gray;
  if (dd > -5) return C.green;
  if (dd > -15) return C.amber;
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
  const maxDrawdown = getMaxDrawdown();

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
        <MetricCard
          label="TWR total"
          value={fmtPct(twr)}
          subtext="Time-Weighted Return desde inicio"
          accentColor={twr !== null ? (twr >= 0 ? C.green : C.red) : undefined}
        />
        <MetricCard
          label="CAGR"
          value={fmtPct(cagr)}
          subtext={cagrPeriod ?? "Rentabilidad anualizada compuesta"}
          accentColor={cagr !== null ? (cagr >= 0 ? C.green : C.red) : undefined}
        />
        <MetricCard
          label="Volatilidad"
          value={vol !== null ? `${(vol * 100).toFixed(1)}%` : null}
          subtext="Desviación estándar anualizada"
          accentColor={volColor(vol)}
        />
        <MetricCard
          label="Sharpe"
          value={fmtFixed(sharpe)}
          subtext="Retorno ajustado al riesgo vs 3% RF"
          accentColor={sharpeColor(sharpe)}
          badge={sharpeMeta?.badge}
          badgeColor={sharpeMeta?.color}
        />
        <MetricCard
          label="Max Drawdown"
          value={maxDrawdown !== null ? `${maxDrawdown.toFixed(1)}%` : null}
          subtext="Caída máxima desde pico histórico"
          accentColor={drawdownColor(maxDrawdown)}
        />
      </div>
    </div>
  );
}
