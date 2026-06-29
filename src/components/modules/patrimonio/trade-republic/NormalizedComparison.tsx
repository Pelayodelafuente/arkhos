"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { loadAssetPriceHistory } from "@/app/actions/patrimonio";
import type { AssetPricePoint } from "@/lib/supabase/patrimonio";
import { ChartShell, ChartTooltip, useCrosshair } from "@/components/viz";
import type { ChartTooltipProps } from "@/components/viz";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

/**
 * Comparación normalizada (base 100) — Fase 2.4.
 * Resucitada con `asset_price_history` (histórico de precio por ISIN, ~mensual),
 * el dato que antes faltaba y dejaba el gráfico muerto. Autocontenida: carga el
 * histórico de forma lazy y permite elegir activos con pills.
 */

const COLORS = ["#2E7D6B", "#B07A3A", "#7260C4", "#3B78B0", "#C4704A"];
const MAX_SERIES = 5;

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

interface NormalizedRow {
  date: string;
  [isin: string]: number | string;
}

function buildNormalized(selected: string[], history: AssetPricePoint[]): NormalizedRow[] {
  if (selected.length === 0 || history.length === 0) return [];

  const byIsin = new Map<string, Array<{ date: string; price: number }>>();
  for (const p of history) {
    if (!selected.includes(p.isin)) continue;
    const arr = byIsin.get(p.isin) ?? [];
    arr.push({ date: p.price_date, price: p.price_eur });
    byIsin.set(p.isin, arr);
  }
  for (const arr of byIsin.values()) arr.sort((a, b) => a.date.localeCompare(b.date));

  // Origen común = la más tardía de las primeras fechas de cada serie (base 100 ahí).
  const firstDates = [...byIsin.values()].map((arr) => arr[0]?.date).filter(Boolean) as string[];
  if (firstDates.length === 0) return [];
  const baseDate = firstDates.reduce((m, d) => (d > m ? d : m), firstDates[0]);

  const basePrice = new Map<string, number>();
  for (const [isin, arr] of byIsin) {
    const bp = arr.find((p) => p.date >= baseDate);
    if (bp) basePrice.set(isin, bp.price);
  }

  const dateSet = new Set<string>();
  for (const arr of byIsin.values()) for (const p of arr) if (p.date >= baseDate) dateSet.add(p.date);
  const dates = [...dateSet].sort();

  return dates.map((date) => {
    const row: NormalizedRow = { date };
    for (const [isin, arr] of byIsin) {
      const base = basePrice.get(isin);
      if (!base) continue;
      let price: number | null = null;
      for (const p of arr) {
        if (p.date <= date) price = p.price;
        else break;
      }
      if (price != null) row[isin] = parseFloat(((price / base) * 100).toFixed(2));
    }
    return row;
  });
}

export function NormalizedComparison() {
  const assets = usePatrimonioStore((s) => s.assets); // trigger re-render reactivo
  const getTRAssets = usePatrimonioStore((s) => s.getTRAssets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trAssets = useMemo(() => getTRAssets(), [assets, getTRAssets]);

  const [history, setHistory] = useState<AssetPricePoint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    loadAssetPriceHistory().then((rows) => {
      if (alive) {
        setHistory(rows);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const isinSet = useMemo(() => new Set(history.map((h) => h.isin)), [history]);
  const available = useMemo(
    () => trAssets.filter((a) => a.isin && a.category !== "cash" && isinSet.has(a.isin)),
    [trAssets, isinSet]
  );

  const isinLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of trAssets) if (a.isin) m.set(a.isin, a.ticker ?? a.name.slice(0, 10));
    return m;
  }, [trAssets]);

  // Selección efectiva: si el usuario no ha tocado nada, por defecto los 3 primeros
  // activos con histórico (derivado, sin setState-en-efecto).
  const defaultSel = useMemo(() => available.slice(0, 3).map((a) => a.isin as string), [available]);
  const active = selected.length > 0 ? selected : defaultSel;

  const data = useMemo(() => buildNormalized(active, history), [active, history]);

  const { activeIndex, chartProps } = useCrosshair();
  const reduced = usePrefersReducedMotion();

  const toggle = (isin: string) => {
    const base = selected.length > 0 ? selected : defaultSel;
    setSelected(
      base.includes(isin)
        ? base.filter((x) => x !== isin)
        : base.length < MAX_SERIES
          ? [...base, isin]
          : base
    );
  };

  // Sin histórico disponible → no renderizar nada (evita UI inerte).
  if (loaded && available.length === 0) return null;

  return (
    <ChartShell title="Comparación normalizada" subtitle="Base 100 en el origen común">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {available.map((a) => {
          const isin = a.isin as string;
          const on = active.includes(isin);
          const color = COLORS[Math.max(0, active.indexOf(isin)) % COLORS.length];
          return (
            <button
              key={isin}
              type="button"
              onClick={() => toggle(isin)}
              className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: on ? `color-mix(in srgb, ${color} 14%, transparent)` : "var(--bg-sand)",
                color: on ? color : "var(--text-tertiary)",
                border: `1px solid ${on ? color : "var(--border)"}`,
              }}
              aria-pressed={on}
            >
              {isinLabel.get(isin) ?? isin}
            </button>
          );
        })}
      </div>

      {data.length < 2 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {loaded ? "Selecciona al menos un activo con histórico." : "Cargando histórico…"}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  {...(props as unknown as ChartTooltipProps)}
                  labelFormatter={(l) => fmtDate(l as string)}
                  nameFormatter={(n) => isinLabel.get(n) ?? n}
                  valueFormatter={(v) => v.toFixed(1)}
                />
              )}
              cursor={false}
            />
            <ReferenceLine y={100} stroke="var(--border)" strokeDasharray="4 2" />
            {activeIndex != null && data[activeIndex] && (
              <ReferenceLine
                x={data[activeIndex].date}
                stroke="var(--text-tertiary)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
            {active.map((isin, i) => (
              <Line
                key={isin}
                type="monotone"
                dataKey={isin}
                isAnimationActive={!reduced}
                animationDuration={500}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={1.75}
                dot={false}
                connectNulls
                name={isin}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );
}
