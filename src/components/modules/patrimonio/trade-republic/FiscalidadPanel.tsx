"use client";

import { useMemo } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PortfolioTransaction, PortfolioAsset } from "@/types/patrimonio";

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
  let remaining = base;
  return (
    <div className="mt-2 space-y-0.5 rounded-lg bg-sand/40 p-3">
      {TRAMOS.map((t) => {
        if (remaining <= 0) return null;
        const taxable = Math.min(remaining, t.limit);
        const tax = taxable * t.rate;
        remaining -= taxable;
        return (
          <div key={t.label} className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">{t.label}</span>
            <span className="font-mono text-text-secondary">{formatEur(tax)}</span>
          </div>
        );
      })}
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
