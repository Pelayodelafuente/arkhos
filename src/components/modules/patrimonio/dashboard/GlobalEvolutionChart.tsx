"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";
import { formatEur, formatEurShort } from "@/lib/utils/format";
import { ChartShell, ChartTooltip, useCrosshair } from "@/components/viz";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { ChartTooltipProps } from "@/components/viz";


// 'YYYY-MM-DD' o 'YYYY-MM' → 'YYYY-MM'
function toMonthKey(s: string): string { return s.substring(0, 7); }

// 'YYYY-MM' → 'MM/YY'
function monthKeyLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${m}/${(y ?? "").slice(-2)}`;
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

type BenchmarkIndex = "none" | "sp500" | "world";

const BENCHMARK_LABELS: Record<Exclude<BenchmarkIndex, "none">, string> = {
  sp500: "S&P 500",
  world: "MSCI World",
};

export function GlobalEvolutionChart() {
  const [period, setPeriod] = useState<"3M" | "6M" | "1A" | "Todo">("Todo");
  const [benchmark, setBenchmark] = useState<BenchmarkIndex>("none");
  const [benchLoaded, setBenchLoaded] = useState<
    Partial<Record<Exclude<BenchmarkIndex, "none">, Map<string, number>>>
  >({});
  const benchPrices = benchmark === "none" ? null : benchLoaded[benchmark] ?? null;
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
  // Las deps extra son triggers: el getter lee get() internamente y debe recomputar al cambiar el store
  // Sin `void x` en el cuerpo: React Compiler los elimina y dejaría de reaccionar al store.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cryptoOverview = useMemo(() => getCryptoOverview(), [cryptoAssets, cryptoDefi, getCryptoOverview]);

  // ── Mintos — snapshots mensuales con valor estimado ──────────────────────
  const mintosSnapshots = useMintosStore((s) => s.monthlySnapshots);
  const mintosOverview = useMintosStore((s) => s.overview);
  const mintosDeposits = useMintosStore((s) => s.deposits);

  // ── Total invertido live (misma fórmula que las tarjetas KPI) ────────────
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

    const points: { key: string; label: string; value: number; invested: number }[] = [];
    for (let idx = 0; idx < allKeys.length; idx++) {
      const key = allKeys[idx];
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

      points.push({
        key,
        label: monthKeyLabel(key),
        // Último punto siempre usa datos live para coincidir con KPI cards
        value: parseFloat(
          (isLastPoint && liveTotalValue > 0 ? liveTotalValue : historicalValue).toFixed(2)
        ),
        invested: parseFloat(
          (isLastPoint && liveInvested > 0 ? liveInvested : historicalInvested).toFixed(2)
        ),
      });
    }
    return points;
  }, [trByMonth, indexaByMonth, horosByMonth, cryptoByMonth, mintosByMonth, cryptoOverview, mintosOverview, liveInvested, liveTotalValue]);

  // ── Benchmark: cierres mensuales EUR del índice seleccionado ─────────────
  useEffect(() => {
    if (benchmark === "none" || benchLoaded[benchmark]) return;
    let cancelled = false;
    fetch(`/api/patrimonio/benchmark?index=${benchmark}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: { prices: { month: string; close: number }[] }) => {
        if (cancelled) return;
        const map = new Map(json.prices.map((p) => [p.month, p.close]));
        setBenchLoaded((prev) => ({ ...prev, [benchmark]: map }));
      })
      .catch(() => {
        // fallo silencioso: la línea simplemente no se dibuja
      });
    return () => {
      cancelled = true;
    };
  }, [benchmark, benchLoaded]);

  // ── Simulación DCA: mismas aportaciones mensuales compradas al índice ────
  const dataWithBenchmark = useMemo(() => {
    if (benchmark === "none" || !benchPrices || benchPrices.size === 0) return data;
    const sortedMonths = [...benchPrices.keys()].sort();
    const closeFor = (key: string): number | null => {
      if (benchPrices.has(key)) return benchPrices.get(key)!;
      // cierre más cercano anterior; si no hay, el primero disponible
      const prev = sortedMonths.filter((m) => m <= key);
      const pick = prev.length > 0 ? prev[prev.length - 1] : sortedMonths[0];
      return pick ? benchPrices.get(pick)! : null;
    };

    let shares = 0;
    let prevInvested = 0;
    return data.map((p) => {
      const close = closeFor(p.key);
      if (close === null) return p;
      const delta = p.invested - prevInvested;
      prevInvested = p.invested;
      shares += delta / close;
      return { ...p, benchmark: parseFloat((shares * close).toFixed(2)) };
    });
  }, [data, benchmark, benchPrices]);

  const cutoffDate = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "3M": { const d = new Date(now); d.setDate(d.getDate() - 90); return d.toISOString().substring(0, 7); }
      case "6M": { const d = new Date(now); d.setDate(d.getDate() - 180); return d.toISOString().substring(0, 7); }
      case "1A": { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d.toISOString().substring(0, 7); }
      default: return null;
    }
  }, [period]);

  const filteredData = useMemo(() => {
    if (!cutoffDate) return dataWithBenchmark;
    return dataWithBenchmark.filter(p => p.key >= cutoffDate);
  }, [dataWithBenchmark, cutoffDate]);

  // Bug #6: Crypto y Mintos no tienen histórico de valor de mercado: los meses
  // previos muestran coste y solo el último punto usa valor de mercado live.
  // Se anota el límite en vez de alterar el dato.
  const lastLabel = filteredData[filteredData.length - 1]?.label ?? null;
  const showMarketCaveat =
    (cryptoOverview?.total_value_eur ?? 0) > 0 || (mintosOverview?.total_value ?? 0) > 0;

  const { activeIndex, chartProps } = useCrosshair();
  const reduced = usePrefersReducedMotion();
  const anim = { isAnimationActive: !reduced, animationDuration: 500 } as const;

  if (data.length === 0) return <EmptyState />;

  return (
    <ChartShell
      title="Evolución del patrimonio"
      subtitle="TR · Indexa · Horos · Mintos · Crypto — histórico acumulado"
      className="overflow-hidden"
      actions={
        <div className="flex flex-wrap justify-end gap-1">
          {(["3M", "6M", "1A", "Todo"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors"
              style={{
                backgroundColor: period === p ? "var(--module-patrimonio)" : "var(--bg-sand)",
                color: period === p ? "#fff" : "var(--text-tertiary)",
                border: `1px solid ${period === p ? "var(--module-patrimonio)" : "var(--border)"}`,
              }}
              aria-pressed={period === p}
            >
              {p}
            </button>
          ))}
          <span className="mx-0.5 w-px self-stretch" style={{ backgroundColor: "var(--border)" }} aria-hidden="true" />
          {(["sp500", "world"] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBenchmark((cur) => (cur === b ? "none" : b))}
              title={`Comparar con ${BENCHMARK_LABELS[b]} (misma aportación mensual)`}
              className="rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors"
              style={{
                backgroundColor: benchmark === b ? "var(--module-mercados)" : "var(--bg-sand)",
                color: benchmark === b ? "#fff" : "var(--text-tertiary)",
                border: `1px solid ${benchmark === b ? "var(--module-mercados)" : "var(--border)"}`,
              }}
              aria-pressed={benchmark === b}
            >
              {BENCHMARK_LABELS[b]}
            </button>
          ))}
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={310}>
        <AreaChart data={filteredData} margin={{ top: 4, right: 4, left: 0, bottom: 8 }} {...chartProps}>
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
              <ChartTooltip
                {...(props as unknown as ChartTooltipProps)}
                nameFormatter={(name) =>
                  name === "value"
                    ? "Patrimonio"
                    : name === "benchmark"
                      ? benchmark !== "none"
                        ? BENCHMARK_LABELS[benchmark]
                        : "Índice"
                      : "Invertido"
                }
                valueFormatter={(v) => formatEur(v)}
              />
            )}
            cursor={false}
          />

          <Area
            type="monotone"
            dataKey="invested"
            {...anim}
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
            {...anim}
            stroke="#2E7D6B"
            strokeWidth={2}
            fill="url(#gradValue)"
            dot={false}
            activeDot={{ r: 4, fill: "#2E7D6B" }}
            name="value"
          />
          {benchmark !== "none" && benchPrices && (
            <Area
              type="monotone"
              dataKey="benchmark"
              {...anim}
              stroke="var(--module-mercados, #9B7A4A)"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              fill="transparent"
              dot={false}
              activeDot={{ r: 3, fill: "var(--module-mercados, #9B7A4A)" }}
              name="benchmark"
            />
          )}
          {showMarketCaveat && lastLabel && (
            <ReferenceLine
              x={lastLabel}
              stroke="var(--text-tertiary)"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              label={{ value: "mercado", position: "insideTopRight", fontSize: 9, fill: "var(--text-tertiary)" }}
            />
          )}
          {activeIndex != null && filteredData[activeIndex] && (
            <ReferenceLine
              x={filteredData[activeIndex].label}
              stroke="var(--text-tertiary)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          <Brush
            dataKey="label"
            height={20}
            stroke="var(--border)"
            fill="var(--bg-sand, var(--bg-card))"
            travellerWidth={6}
          />
        </AreaChart>
      </ResponsiveContainer>
      {benchmark !== "none" && benchPrices && (
        <p className="mt-2 text-[10px] leading-snug" style={{ color: "var(--text-tertiary)" }}>
          La línea punteada simula invertir tus mismas aportaciones mensuales en{" "}
          {BENCHMARK_LABELS[benchmark]} (ETF UCITS en EUR, cierres mensuales de Yahoo Finance).
        </p>
      )}
      {showMarketCaveat && (
        <p className="mt-2 text-[10px] leading-snug" style={{ color: "var(--text-tertiary)" }}>
          El valor de Cripto y Mintos refleja precio de mercado actual desde el último punto
          («mercado»); los meses anteriores muestran el capital aportado de esas plataformas,
          al no existir histórico de valor de mercado.
        </p>
      )}
    </ChartShell>
  );
}
