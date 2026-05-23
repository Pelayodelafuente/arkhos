"use client";

import { useMemo, useState, useEffect } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PortfolioTransaction, PortfolioAsset } from "@/types/patrimonio";

type TLHStatusValue = "pendiente" | "revisado" | "aplicado";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const YEAR = new Date().getFullYear().toString();

// ---------------------------------------------------------------------------
// FIFO computation
// ---------------------------------------------------------------------------

interface BuyLot {
  date: string;
  quantity: number;
  pricePerUnit: number;
}

interface RealizedItem {
  assetId: string;
  assetName: string;
  date: string;
  quantity: number;
  costBasis: number;
  proceeds: number;
  pl: number;
}

function computeFIFO(
  transactions: PortfolioTransaction[],
  assetMap: Map<string, PortfolioAsset>
): { realized: RealizedItem[]; totalRealized: number } {
  const buyLots = new Map<string, BuyLot[]>();
  const sells: PortfolioTransaction[] = [];

  const sorted = [...transactions].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date)
  );

  for (const t of sorted) {
    if (!t.asset_id) continue;
    if (t.type === "buy" || t.type === "savings_plan") {
      if (!t.quantity || !t.price_per_unit) continue;
      const lots = buyLots.get(t.asset_id) ?? [];
      lots.push({ date: t.transaction_date, quantity: t.quantity, pricePerUnit: t.price_per_unit });
      buyLots.set(t.asset_id, lots);
    }
    if (t.type === "sell") sells.push(t);
  }

  const realized: RealizedItem[] = [];

  for (const sell of sells) {
    if (!sell.asset_id || !sell.quantity) continue;
    const asset = assetMap.get(sell.asset_id);
    const lots = [...(buyLots.get(sell.asset_id) ?? [])];
    let remaining = sell.quantity;
    let cost = 0;
    const proceeds = sell.total_amount;

    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0];
      if (lot.quantity <= remaining) {
        cost += lot.quantity * lot.pricePerUnit;
        remaining -= lot.quantity;
        lots.shift();
      } else {
        cost += remaining * lot.pricePerUnit;
        lot.quantity -= remaining;
        remaining = 0;
      }
    }

    realized.push({
      assetId: sell.asset_id,
      assetName: asset?.name ?? sell.asset_id,
      date: sell.transaction_date,
      quantity: sell.quantity,
      costBasis: cost,
      proceeds,
      pl: proceeds - cost,
    });
  }

  return { realized, totalRealized: realized.reduce((s, r) => s + r.pl, 0) };
}

// ---------------------------------------------------------------------------
// IRPF tramos base del ahorro 2024
// ---------------------------------------------------------------------------

const TRAMOS = [
  { limit: 6000, rate: 0.19, label: "0–6.000 € al 19 %" },
  { limit: 44000, rate: 0.21, label: "6.000–50.000 € al 21 %" },
  { limit: 150000, rate: 0.23, label: "50.000–200.000 € al 23 %" },
  { limit: 100000, rate: 0.27, label: "200.000–300.000 € al 27 %" },
  { limit: Infinity, rate: 0.28, label: "> 300.000 € al 28 %" },
] as const;

function calcIRPF(base: number): number {
  if (base <= 0) return 0;
  let tax = 0;
  let remaining = base;
  for (const { limit, rate } of TRAMOS) {
    const taxable = Math.min(remaining, limit);
    tax += taxable * rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return tax;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FiscalCardProps {
  label: string;
  value: string;
  sub: string;
  accentColor: string;
}

function FiscalCard({ label, value, sub, accentColor }: FiscalCardProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card p-4"
      style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
    >
      <p className="text-xs font-medium text-text-tertiary">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-text-tertiary">{sub}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  const color =
    value > 0 ? "#2E7D6B" : value < 0 ? "#A32D2D" : "var(--text-secondary)";
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="font-mono text-sm" style={{ color }}>
        {value >= 0 ? "+" : ""}
        {formatEur(value)}
      </span>
    </div>
  );
}

function TramosDetail({ base }: { base: number }) {
  if (base <= 0) return null;
  const tramoRows = TRAMOS.reduce<{ rows: Array<{ label: string; tax: number }>; remaining: number }>(
    ({ rows, remaining }, t) => {
      if (remaining <= 0) return { rows, remaining };
      const taxable = Math.min(remaining, t.limit);
      const tax = taxable * t.rate;
      return { rows: [...rows, { label: t.label, tax }], remaining: remaining - taxable };
    },
    { rows: [], remaining: base }
  ).rows;
  return (
    <div className="mt-2 space-y-0.5 rounded-lg bg-sand/40 p-3">
      {tramoRows.map(({ label, tax }) => (
        <div key={label} className="flex items-center justify-between text-xs">
          <span className="text-text-tertiary">{label}</span>
          <span className="font-mono text-text-secondary">{formatEur(tax)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tax Loss Harvesting tracker
// ---------------------------------------------------------------------------

interface TLHCandidate {
  id: string;
  ticker: string;
  name: string;
  currentValue: number;
  costBasis: number;
  lossAmount: number;
  lossPercent: number;
  taxSaving: number;
}

interface TaxLossHarvestingProps {
  trNonCash: PortfolioAsset[];
  totalRealizedThisYear: number;
}

const TLH_STATUS_LABELS: Record<TLHStatusValue, string> = {
  pendiente: "Pendiente",
  revisado: "Revisado",
  aplicado: "Aplicado",
};

const TLH_STATUS_COLORS: Record<TLHStatusValue, { bg: string; text: string }> = {
  pendiente: { bg: "rgba(163,45,45,0.10)", text: "#A32D2D" },
  revisado: { bg: "rgba(176,122,58,0.12)", text: "#B07A3A" },
  aplicado: { bg: "rgba(46,125,107,0.10)", text: "#2E7D6B" },
};

const TLH_STATUS_OPTIONS: TLHStatusValue[] = ["pendiente", "revisado", "aplicado"];

function TaxLossHarvestingPanel({ trNonCash, totalRealizedThisYear }: TaxLossHarvestingProps) {
  const [tlhStatus, setTlhStatus] = useState<Record<string, TLHStatusValue>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("arkhos_tlh_status") ?? "{}") as Record<string, TLHStatusValue>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("arkhos_tlh_status", JSON.stringify(tlhStatus));
  }, [tlhStatus]);

  function cycleStatus(id: string) {
    setTlhStatus((prev) => {
      const current = prev[id] ?? "pendiente";
      const currentIdx = TLH_STATUS_OPTIONS.indexOf(current);
      const nextIdx = (currentIdx + 1) % TLH_STATUS_OPTIONS.length;
      const next: TLHStatusValue = TLH_STATUS_OPTIONS[nextIdx] ?? "pendiente";
      return { ...prev, [id]: next };
    });
  }

  const candidates: TLHCandidate[] = trNonCash
    .filter((a) => (a.pl_amount ?? 0) < 0)
    .map((a) => {
      const lossAmount = a.pl_amount ?? 0;
      const currentValue = a.current_value ?? a.total_invested + lossAmount;
      const costBasis = a.total_invested;
      const lossPercent =
        costBasis > 0 ? (lossAmount / costBasis) * 100 : 0;
      const taxSaving = Math.abs(lossAmount) * 0.19;
      return {
        id: a.id,
        ticker: a.ticker ?? a.name.slice(0, 6).toUpperCase(),
        name: a.name,
        currentValue,
        costBasis,
        lossAmount,
        lossPercent,
        taxSaving,
      };
    })
    .sort((a, b) => a.lossAmount - b.lossAmount);

  const totalLatentLoss = candidates.reduce((s, c) => s + Math.abs(c.lossAmount), 0);
  const compensable = Math.min(Math.max(0, totalRealizedThisYear), totalLatentLoss);
  const estimatedSaving = compensable * 0.19;
  const canFullyOffset =
    totalRealizedThisYear > 0 && totalLatentLoss >= totalRealizedThisYear;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Optimización fiscal — Tax Loss Harvesting
        </h3>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: "var(--bg-sand)",
            color: "var(--text-tertiary)",
            border: "1px solid var(--border)",
          }}
        >
          Orientativo
        </span>
      </div>

      {/* KPI destacado */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ borderTopColor: "var(--module-patrimonio)", borderTopWidth: 2 }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
              Ganancias realizadas {YEAR}
            </p>
            <p
              className="mt-1 font-mono text-lg font-semibold"
              style={{
                color:
                  totalRealizedThisYear > 0
                    ? "#C4704A"
                    : totalRealizedThisYear < 0
                    ? "#2E7D6B"
                    : "var(--foreground)",
              }}
            >
              {formatEur(totalRealizedThisYear)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
              Pérdidas latentes disponibles
            </p>
            <p className="mt-1 font-mono text-lg font-semibold" style={{ color: "#A32D2D" }}>
              -{formatEur(totalLatentLoss)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
              Ahorro fiscal estimado
            </p>
            <p className="mt-1 font-mono text-lg font-semibold" style={{ color: "#2E7D6B" }}>
              {formatEur(estimatedSaving)}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {formatEur(compensable)} compensable × 19%
            </p>
          </div>
        </div>

        {totalRealizedThisYear > 0 && (
          <div
            className="mt-4 rounded-lg px-4 py-3"
            style={{
              backgroundColor: canFullyOffset ? "rgba(46,125,107,0.08)" : "rgba(163,45,45,0.08)",
              border: `1px solid ${canFullyOffset ? "rgba(46,125,107,0.25)" : "rgba(163,45,45,0.25)"}`,
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: canFullyOffset ? "#2E7D6B" : "#A32D2D" }}
            >
              {canFullyOffset
                ? "Puedes compensar totalmente las ganancias de este año"
                : `Solo puedes compensar ${formatEur(totalLatentLoss)} de ${formatEur(totalRealizedThisYear)} en ganancias`}
            </p>
          </div>
        )}

        {totalRealizedThisYear <= 0 && candidates.length > 0 && (
          <div
            className="mt-4 rounded-lg px-4 py-3"
            style={{
              backgroundColor: "rgba(46,125,107,0.08)",
              border: "1px solid rgba(46,125,107,0.25)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "#2E7D6B" }}>
              Sin ganancias realizadas este año. Las pérdidas latentes podrán compensar ganancias futuras hasta 4 años.
            </p>
          </div>
        )}
      </div>

      {/* Candidatos TLH */}
      {candidates.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            Candidatos a realizar pérdidas ({candidates.length})
          </h4>
          <div className="space-y-3">
            {candidates.map((c) => {
              const status = tlhStatus[c.id] ?? "pendiente";
              const statusStyle = TLH_STATUS_COLORS[status];
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: "rgba(163,45,45,0.12)",
                        color: "#A32D2D",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {c.lossPercent.toFixed(1)}%
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {c.ticker} · coste {formatEur(c.costBasis)} · valor {formatEur(c.currentValue)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <p className="font-mono text-sm font-semibold" style={{ color: "#A32D2D" }}>
                      {formatEur(c.lossAmount)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      ahorro {formatEur(c.taxSaving)}
                    </p>
                    <button
                      type="button"
                      onClick={() => cycleStatus(c.id)}
                      className="rounded-full px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      aria-label={`Estado TLH: ${TLH_STATUS_LABELS[status]}. Haz clic para cambiar.`}
                    >
                      {TLH_STATUS_LABELS[status]}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl border border-border px-5 py-8 text-center"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <p className="text-sm font-medium text-foreground">
            Sin posiciones con pérdidas latentes
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Todas tus posiciones en TR están en positivo o son efectivo.
          </p>
        </div>
      )}

      {/* Nota legal */}
      <div
        className="rounded-xl border border-border p-4"
        style={{ backgroundColor: "var(--bg-sand)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Este análisis es orientativo. Consulta con un asesor fiscal antes de tomar decisiones.
          La regla de los 2 meses (art. 33.5 LIRPF) impide recomprar el mismo activo (o uno
          sustancialmente idéntico) en los 2 meses anteriores o posteriores a la venta con pérdida
          si quieres que esa pérdida sea computable en el mismo ejercicio. El ahorro estimado
          usa el primer tramo IRPF (19%) como referencia simplificada.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function FiscalidadPanel() {
  const transactions = usePatrimonioStore((s) => s.transactions);
  const passiveIncome = usePatrimonioStore((s) => s.passiveIncome);
  const assets = usePatrimonioStore((s) => s.assets);
  const getTRAssets = usePatrimonioStore((s) => s.getTRAssets);
  const trAssets = getTRAssets();

  const assetMap = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets]
  );

  const { realized } = useMemo(
    () => computeFIFO(transactions, assetMap),
    [transactions, assetMap]
  );

  const realizedThisYear = realized.filter((r) => r.date.startsWith(YEAR));
  const totalRealizedThisYear = realizedThisYear.reduce((s, r) => s + r.pl, 0);

  const incomeThisYear = passiveIncome.filter((i) => i.income_date.startsWith(YEAR));
  const dividendsThisYear = incomeThisYear
    .filter((i) => i.type === "dividend")
    .reduce((s, i) => s + i.amount, 0);
  const interestsThisYear = incomeThisYear
    .filter((i) => i.type === "interest")
    .reduce((s, i) => s + i.amount, 0);
  const savebackThisYear = incomeThisYear
    .filter((i) => i.type === "saveback")
    .reduce((s, i) => s + i.amount, 0);
  const totalPassiveThisYear = dividendsThisYear + interestsThisYear + savebackThisYear;

  const baseImponible = Math.max(0, totalRealizedThisYear + totalPassiveThisYear);
  const irpfEstimado = calcIRPF(baseImponible);
  const tipoEfectivo = baseImponible > 0 ? (irpfEstimado / baseImponible) * 100 : 0;

  const trNonCash = trAssets.filter((a) => a.category !== "cash");
  const latentPLTotal = trNonCash.reduce((s, a) => s + (a.pl_amount ?? 0), 0);
  const latentPLPositive = trNonCash
    .filter((a) => (a.pl_amount ?? 0) > 0)
    .reduce((s, a) => s + (a.pl_amount ?? 0), 0);
  const irpfSiVendieras = calcIRPF(latentPLPositive);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Fiscalidad estimada — {YEAR}
        </h3>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: "var(--bg-sand)",
            color: "var(--text-tertiary)",
            border: "1px solid var(--border)",
          }}
        >
          Orientativo — consulta un asesor fiscal
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FiscalCard
          label="Dividendos recibidos"
          value={formatEur(dividendsThisYear)}
          sub={`${YEAR} · equity`}
          accentColor="#2E7D6B"
        />
        <FiscalCard
          label="Intereses + Saveback"
          value={formatEur(interestsThisYear + savebackThisYear)}
          sub={`${YEAR} · cuenta TR`}
          accentColor="#4A7A9B"
        />
        <FiscalCard
          label="Ganancias realizadas"
          value={formatEur(totalRealizedThisYear)}
          sub={realizedThisYear.length > 0 ? `${realizedThisYear.length} ventas FIFO` : "Sin ventas este año"}
          accentColor={totalRealizedThisYear >= 0 ? "#2E7D6B" : "#A32D2D"}
        />
        <FiscalCard
          label="IRPF estimado"
          value={formatEur(irpfEstimado)}
          sub={`Base: ${formatEur(baseImponible)} · tipo ef. ${tipoEfectivo.toFixed(1)}%`}
          accentColor="#C4704A"
        />
      </div>

      {/* IRPF breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="mb-3 text-sm font-semibold text-foreground">
          Cálculo IRPF — base del ahorro {YEAR}
        </h4>
        <div className="divide-y divide-border">
          <Row label="Dividendos" value={dividendsThisYear} />
          <Row label="Intereses" value={interestsThisYear} />
          <Row label="Saveback" value={savebackThisYear} />
          <Row label="Ganancias realizadas (FIFO)" value={totalRealizedThisYear} />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">Base imponible</span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatEur(baseImponible)}
          </span>
        </div>
        <TramosDetail base={baseImponible} />
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">IRPF a pagar</span>
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: irpfEstimado > 0 ? "#C4704A" : "var(--text-secondary)" }}
          >
            {formatEur(irpfEstimado)}
            {tipoEfectivo > 0 && (
              <span className="ml-2 text-xs font-normal text-text-tertiary">
                ({tipoEfectivo.toFixed(1)}% tipo efectivo)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Latent P&L */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="mb-3 text-sm font-semibold text-foreground">P&L latente (no realizado)</h4>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">P&L total cartera TR</span>
            <span
              className="font-mono text-sm font-semibold"
              style={{ color: latentPLTotal >= 0 ? "#2E7D6B" : "#A32D2D" }}
            >
              {latentPLTotal >= 0 ? "+" : ""}
              {formatEur(latentPLTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">Plusvalías latentes (positivas)</span>
            <span className="font-mono text-sm" style={{ color: "#2E7D6B" }}>
              +{formatEur(latentPLPositive)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">IRPF si vendieras todo hoy</span>
            <span className="font-mono text-sm" style={{ color: "#C4704A" }}>
              {formatEur(irpfSiVendieras)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-text-tertiary">
          La plusvalía latente ({formatEur(latentPLPositive)}) tributaría como ganancia patrimonial al vender.
          Las minusvalías latentes pueden compensar ganancias en el ejercicio y en los 4 años siguientes.
        </p>
      </div>

      {/* Realized sales table */}
      {realizedThisYear.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            Ventas realizadas {YEAR} — cálculo FIFO
          </h4>
          <div className="space-y-3">
            {realizedThisYear.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{r.assetName}</p>
                  <p className="text-xs text-text-tertiary">
                    {new Date(r.date).toLocaleDateString("es-ES")} ·{" "}
                    {r.quantity.toLocaleString("es-ES", { maximumFractionDigits: 4 })} ud.
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="font-mono text-sm font-semibold"
                    style={{ color: r.pl >= 0 ? "#2E7D6B" : "#A32D2D" }}
                  >
                    {r.pl >= 0 ? "+" : ""}
                    {formatEur(r.pl)}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Coste {formatEur(r.costBasis)} → {formatEur(r.proceeds)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {realizedThisYear.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
          <p className="text-sm font-medium text-text-secondary">Sin ventas en {YEAR}</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Las ganancias realizadas tributan solo al vender. Mientras mantengas las posiciones,
            el P&L es latente y no genera obligación fiscal.
          </p>
        </div>
      )}

      {/* Tax Loss Harvesting */}
      <div className="border-t border-border pt-5">
        <TaxLossHarvestingPanel
          trNonCash={trNonCash}
          totalRealizedThisYear={totalRealizedThisYear}
        />
      </div>

      {/* Disclaimer */}
      <div
        className="rounded-xl border border-border p-4"
        style={{ backgroundColor: "var(--bg-sand)" }}
      >
        <p className="text-xs text-text-tertiary">
          Tramos IRPF base del ahorro 2024 (art. 66 LIRPF): 0–6.000 € al 19 %, 6.000–50.000 € al
          21 %, 50.000–200.000 € al 23 %, 200.000–300.000 € al 27 %, más de 300.000 € al 28 %.
          No se consideran retenciones en origen (ej. withholding tax USA 15 %), compensaciones de
          pérdidas de ejercicios anteriores, deducciones autonómicas ni mínimo exento. Consulta
          con un asesor fiscal antes de tomar decisiones.
        </p>
      </div>
    </div>
  );
}
