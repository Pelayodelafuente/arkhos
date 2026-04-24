"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatEurShort = (value: number) => {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k€`;
  return `${value.toFixed(0)}€`;
};

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// 'YYYY-MM-DD' o 'YYYY-MM' → 'YYYY-MM'
function toMonthKey(s: string): string { return s.substring(0, 7); }

// 'YYYY-MM' → 'MM/YY'
function monthKeyLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${m}/${(y ?? "").slice(-2)}`;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipEntry { value: number; name: string; color: string }
interface CustomTooltipProps { active?: boolean; payload?: readonly TooltipEntry[]; label?: string }

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        minWidth: 160,
      }}
    >
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="text-xs" style={{ color: entry.color }}>
            {entry.name === "value" ? "Patrimonio" : "Invertido"}
          </span>
          <span className="font-mono text-sm font-semibold" style={{ color: entry.color }}>
            {formatEur(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-stone, rgba(160,120,80,0.25))" }}>
      <p className="text-sm text-muted-foreground">Sin datos de evolución disponibles</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GlobalEvolutionChart — fusión TR + Indexa (preparado para más plataformas)
// ---------------------------------------------------------------------------

export function GlobalEvolutionChart() {
  // ── TR (snapshots mensuales) ─────────────────────────────────────────────
  const trSnapshots = usePatrimonioStore((s) => s.snapshots);
  const trOverview = usePatrimonioStore((s) => s.overview);

  // ── Indexa — suscripción directa a los datos para forzar re-render ───────
  const indexaTx = useIndexaStore((s) => s.transactions);
  const indexaReturns = useIndexaStore((s) => s.monthlyReturns);
  const indexaOverview = useIndexaStore((s) => s.overview);

  // ── Horos — nav history + transactions para reconstruir valor mensual ────
  const horosNavHistory = useHorosStore((s) => s.navHistory);
  const horosTransactions = useHorosStore((s) => s.transactions);
  const horosPosition = useHorosStore((s) => s.position);

  // ── Crypto — transactions para evolución de capital invertido ────────────
  const cryptoTransactions = useCryptoStore((s) => s.transactions);
  const cryptoAssets = useCryptoStore((s) => s.assets);
  const cryptoDefi = useCryptoStore((s) => s.defiPositions);
  const getCryptoOverview = useCryptoStore((s) => s.getOverview);
  const cryptoOverview = useMemo(() => getCryptoOverview(), [cryptoAssets, cryptoDefi, getCryptoOverview]);

  // ── Mintos — snapshots mensuales con valor estimado ──────────────────────
  const mintosSnapshots = useMintosStore((s) => s.monthlySnapshots);
  const mintosOverview = useMintosStore((s) => s.overview);
  const mintosDeposits = useMintosStore((s) => s.deposits);

  // ── Total invertido live (misma fórmula que GlobalKPIs card) ─────────────
  const liveInvested = useMemo(() => {
    const trInv = trOverview ? trOverview.total_invested - trOverview.total_cash : 0;
    const idxCost = indexaOverview?.total_cost ?? 0;
    const horosCost = horosPosition?.total_cost ?? 0;
    const cryptoInv = cryptoOverview?.total_invested_eur ?? 0;
    const mintosInv = mintosDeposits.reduce((s, d) => s + d.amount, 0);
    return trInv + idxCost + horosCost + cryptoInv + mintosInv;
  }, [trOverview, indexaOverview, horosPosition, cryptoOverview, mintosDeposits]);

  // ── Total valor live (misma fórmula que header/KPI, excluyendo cash TR) ──────
  const liveTotalValue = useMemo(() => {
    const trVal = (trOverview?.total_value ?? 0) - (trOverview?.total_cash ?? 0);
    const idxVal = indexaOverview?.total_value ?? 0;
    const horosVal = horosPosition?.total_value ?? 0;
    const cryptoVal = cryptoOverview?.total_value_eur ?? 0;
    const mintosVal = mintosOverview?.total_value ?? 0;
    return trVal + idxVal + horosVal + cryptoVal + mintosVal;
  }, [trOverview, indexaOverview, horosPosition, cryptoOverview, mintosOverview]);

  // ── Construir mapa mensual de TR: 'YYYY-MM' → {value, invested} ──────────
  const trByMonth = useMemo(() => {
    const map = new Map<string, { value: number; invested: number }>();
    for (const s of trSnapshots) {
      const key = toMonthKey(s.snapshot_date);
      const cash = s.cash_value ?? 0;
      map.set(key, {
        value: s.total_value - cash,
        invested: (s.total_invested ?? 0) - cash,
      });
    }
    return map;
  }, [trSnapshots]);

  // ── Construir evolución mensual de Indexa desde transacciones + retornos ─
  // Solo subscriptions cuentan como dinero nuevo (transfer_in = rebalanceos)
  const indexaByMonth = useMemo(() => {
    if (!indexaTx.length && !indexaReturns.length) return new Map<string, { value: number; cost: number }>();

    // Mapa de contribuciones mensuales reales (solo subscriptions)
    const contribMap = new Map<string, number>();
    for (const tx of indexaTx) {
      if (tx.type !== "subscription") continue;
      const key = toMonthKey(tx.transaction_date);
      contribMap.set(key, (contribMap.get(key) ?? 0) + tx.amount);
    }

    // Mapa de retornos mensuales
    const returnMap = new Map<string, number>();
    for (const r of indexaReturns) {
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      returnMap.set(key, (r.return_pct ?? 0) / 100);
    }

    // Meses únicos cubiertos por Indexa (contribuciones o retornos)
    const allKeys = [...new Set([...contribMap.keys(), ...returnMap.keys()])].sort();

    const map = new Map<string, { value: number; cost: number }>();
    let value = 0;
    let cumCost = 0;

    for (const key of allKeys) {
      const contrib = contribMap.get(key) ?? 0;
      const ret = returnMap.get(key) ?? 0;
      cumCost += contrib;
      value = (value + contrib) * (1 + ret);
      map.set(key, { value: parseFloat(value.toFixed(2)), cost: parseFloat(cumCost.toFixed(2)) });
    }

    return map;
  }, [indexaTx, indexaReturns]);

  // ── Construir mapa mensual de Horos: 'YYYY-MM' → {value, cost} ──────────
  const horosByMonth = useMemo(() => {
    if (horosNavHistory.length === 0 || horosTransactions.length === 0) {
      return new Map<string, { value: number; cost: number }>();
    }

    const map = new Map<string, { value: number; cost: number }>();
    for (const h of horosNavHistory) {
      const key = toMonthKey(h.nav_date);
      const txsToDate = horosTransactions.filter((tx) => tx.value_date <= h.nav_date);
      const cumShares = txsToDate.reduce((s, tx) => s + tx.shares, 0);
      const cumCost = txsToDate.reduce((s, tx) => s + tx.amount, 0);
      if (cumShares > 0) {
        const portfolioValue = parseFloat((cumShares * h.nav_price).toFixed(2));
        const existing = map.get(key);
        if (!existing || cumCost >= existing.cost) {
          map.set(key, { value: portfolioValue, cost: cumCost });
        }
      }
    }
    return map;
  }, [horosNavHistory, horosTransactions]);

  // ── Construir mapa mensual de Crypto: 'YYYY-MM' → {cost} ────────────────
  const cryptoByMonth = useMemo(() => {
    if (cryptoTransactions.length === 0) {
      return new Map<string, number>();
    }
    const map = new Map<string, number>();
    let cumCost = 0;
    const sorted = [...cryptoTransactions]
      .filter((tx) => tx.type === "buy" && tx.amount_eur != null)
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

    for (const tx of sorted) {
      cumCost += tx.amount_eur ?? 0;
      const key = toMonthKey(tx.transaction_date);
      map.set(key, cumCost);
    }
    return map;
  }, [cryptoTransactions]);

  // ── Construir mapa mensual de Mintos: 'YYYY-MM' → {value, deposited} ────
  const mintosByMonth = useMemo(() => {
    if (mintosSnapshots.length === 0) return new Map<string, { value: number; deposited: number }>();
    const map = new Map<string, { value: number; deposited: number }>();
    for (const s of mintosSnapshots) {
      const key = `${s.year}-${String(s.month).padStart(2, '0')}`;
      map.set(key, {
        value: s.total_value ?? s.total_deposited,
        deposited: s.total_deposited,
      });
    }
    return map;
  }, [mintosSnapshots]);

  // ── Fusionar: todos los meses de TR + Indexa + Horos + Crypto + Mintos ──
  const data = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const keySet = new Set([
      ...trByMonth.keys(),
      ...indexaByMonth.keys(),
      ...horosByMonth.keys(),
      ...cryptoByMonth.keys(),
      ...mintosByMonth.keys(),
    ]);

    // Garantizar que el mes actual siempre aparece como último punto
    if (liveTotalValue > 0) keySet.add(currentMonthKey);

    const allKeys = [...keySet].sort();

    let lastIndexa = { value: 0, cost: 0 };
    let lastHoros = { value: 0, cost: 0 };
    let lastCryptoCost = 0;
    let lastMintos = { value: 0, deposited: 0 };

    const cryptoCurrentValue = cryptoOverview?.total_value_eur ?? 0;
    const mintosCurrentValue = mintosOverview?.total_value ?? 0;

    return allKeys.map((key, idx) => {
      const tr = trByMonth.get(key) ?? { value: 0, invested: 0 };
      const indexa = indexaByMonth.get(key);
      if (indexa) lastIndexa = indexa;
      const horos = horosByMonth.get(key);
      if (horos) lastHoros = horos;
      const cryptoCost = cryptoByMonth.get(key);
      if (cryptoCost !== undefined) lastCryptoCost = cryptoCost;
      const mintos = mintosByMonth.get(key);
      if (mintos) lastMintos = mintos;

      const idxValue = lastIndexa.cost > 0 ? lastIndexa.value : 0;
      const idxCost = lastIndexa.cost > 0 ? lastIndexa.cost : 0;
      const horosValue = lastHoros.cost > 0 ? lastHoros.value : 0;
      const horosCost = lastHoros.cost > 0 ? lastHoros.cost : 0;

      const isLastPoint = idx === allKeys.length - 1;
      const cryptoValue = lastCryptoCost > 0
        ? (isLastPoint && cryptoCurrentValue > 0 ? cryptoCurrentValue : lastCryptoCost)
        : 0;
      const mintosValue = lastMintos.deposited > 0
        ? (isLastPoint && mintosCurrentValue > 0 ? mintosCurrentValue : lastMintos.value)
        : 0;

      const historicalValue = tr.value + idxValue + horosValue + cryptoValue + mintosValue;
      const historicalInvested = tr.invested + idxCost + horosCost + lastCryptoCost + lastMintos.deposited;

      return {
        key,
        label: monthKeyLabel(key),
        // Último punto siempre usa datos live para coincidir con KPI cards
        value: parseFloat(
          (isLastPoint && liveTotalValue > 0 ? liveTotalValue : historicalValue).toFixed(2)
        ),
        invested: parseFloat(
          (isLastPoint && liveInvested > 0 ? liveInvested : historicalInvested).toFixed(2)
        ),
      };
    });
  }, [trByMonth, indexaByMonth, horosByMonth, cryptoByMonth, mintosByMonth, cryptoOverview, mintosOverview, liveInvested, liveTotalValue]);

  if (data.length === 0) return <EmptyState />;

  return (
    <div
      className="overflow-hidden rounded-xl p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="mb-4 text-sm font-medium text-foreground">Evolución del patrimonio</p>
      <p className="mb-3 text-xs text-muted-foreground">TR · Indexa · Horos · Mintos · Crypto — histórico acumulado</p>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2E7D6B" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2E7D6B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B78B0" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3B78B0" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,120,80,0.15)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", fill: "var(--muted-foreground, #888780)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={formatEurShort}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", fill: "var(--muted-foreground, #888780)" }}
            axisLine={false}
            tickLine={false}
            width={54}
            domain={["auto", "auto"]}
            className="hidden sm:block"
          />

          <Tooltip
            content={(props) => (
              <CustomTooltip
                active={props.active}
                payload={props.payload as readonly TooltipEntry[] | undefined}
                label={props.label as string | undefined}
              />
            )}
          />

          <Area
            type="monotone"
            dataKey="invested"
            stroke="#3B78B0"
            strokeWidth={1.5}
            fill="url(#gradInvested)"
            dot={false}
            activeDot={{ r: 3, fill: "#3B78B0" }}
            name="invested"
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke="#2E7D6B"
            strokeWidth={2}
            fill="url(#gradValue)"
            dot={false}
            activeDot={{ r: 4, fill: "#2E7D6B" }}
            name="value"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
