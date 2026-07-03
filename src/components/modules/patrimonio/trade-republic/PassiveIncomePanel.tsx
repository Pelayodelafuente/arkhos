"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PassiveIncomeBarItem } from "@/types/patrimonio";

import { formatEur } from "@/lib/utils/format";

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("es-ES", { month: "short" });
};

interface TooltipPayloadItem {
  payload: PassiveIncomeBarItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div
      className="rounded-xl border border-border px-3 py-2.5 text-xs"
      style={{ backgroundColor: "var(--bg-card)", boxShadow: "var(--shadow-modal)" }}
    >
      <p className="font-medium text-text-secondary">{item.month}</p>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between gap-5">
          <span style={{ color: "var(--module-gastos)" }}>Intereses</span>
          <span className="font-mono">{formatEur(item.interest)}</span>
        </div>
        <div className="flex justify-between gap-5">
          <span style={{ color: "var(--module-patrimonio)" }}>Dividendos</span>
          <span className="font-mono">{formatEur(item.dividend)}</span>
        </div>
        <div className="flex justify-between gap-5 border-t border-border pt-1">
          <span className="font-medium text-foreground">Total</span>
          <span className="font-mono font-medium text-foreground">{formatEur(item.total)}</span>
        </div>
      </div>
    </div>
  );
}

export function PassiveIncomePanel() {
  const passiveIncome = usePatrimonioStore((s) => s.passiveIncome);
  const assets = usePatrimonioStore((s) => s.assets);
  const selectedYear = usePatrimonioStore((s) => s.selectedYear);

  const assetMap = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const filteredIncome = useMemo(
    () =>
      selectedYear === 'all'
        ? passiveIncome
        : passiveIncome.filter((item) => item.income_date.startsWith(selectedYear)),
    [passiveIncome, selectedYear]
  );

  const totalPeriod = useMemo(
    () => filteredIncome.reduce((sum, item) => sum + item.amount, 0),
    [filteredIncome]
  );

  const monthData = useMemo(() => {
    const map = new Map<string, { interest: number; dividend: number }>();
    for (const item of filteredIncome) {
      const month = item.income_date.substring(0, 7);
      const current = map.get(month) ?? { interest: 0, dividend: 0 };
      if (item.type === "interest") current.interest += item.amount;
      else current.dividend += item.amount;
      map.set(month, current);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { interest, dividend }]) => ({ month, interest, dividend, total: interest + dividend }));
  }, [filteredIncome]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);

  const sortedIncome = useMemo(
    () => [...filteredIncome].sort((a, b) => b.income_date.localeCompare(a.income_date)),
    [filteredIncome]
  );

  const totalPages = Math.ceil(sortedIncome.length / PAGE_SIZE);
  const pagedIncome = sortedIncome.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} strokeWidth={1.75} style={{ color: "var(--module-gastos)" }} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Ingresos Pasivos</h3>
        </div>
        <span className="font-mono text-sm font-medium" style={{ color: "var(--module-patrimonio)" }}>
          {formatEur(totalPeriod)}{selectedYear !== 'all' ? ` · ${selectedYear}` : ' · Total'}
        </span>
      </div>

      {monthData.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-text-tertiary">Sin registros de ingresos pasivos</p>
        </div>
      ) : (
        <div className="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `${v}€`}
                tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(196,160,120,0.08)" }} />
              <Bar dataKey="interest" stackId="a" fill="var(--module-gastos)" fillOpacity={0.85} radius={[0, 0, 0, 0]} maxBarSize={24} isAnimationActive={false} />
              <Bar dataKey="dividend" stackId="a" fill="var(--color-gain)" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-3 flex gap-5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--module-gastos)" }} aria-hidden="true" />
              <span className="text-xs text-text-secondary">Intereses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-gain)" }} aria-hidden="true" />
              <span className="text-xs text-text-secondary">Dividendos</span>
            </div>
          </div>
        </div>
      )}

      {/* Income list with pagination */}
      {sortedIncome.length > 0 && (
        <div className="border-t border-border px-5 pb-5">
          <div className="flex items-center justify-between pt-4 pb-3">
            <p className="text-xs font-medium text-text-tertiary">
              Todos los ingresos · {sortedIncome.length} registros
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-md px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-sand disabled:opacity-30"
                >
                  ‹ Ant
                </button>
                <span className="text-xs text-text-tertiary font-mono">
                  {page + 1}/{totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="rounded-md px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-sand disabled:opacity-30"
                >
                  Sig ›
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2.5">
            {pagedIncome.map((item) => {
              const asset = item.asset_id ? assetMap.get(item.asset_id) : null;
              const typeLabel =
                item.type === "interest"
                  ? "Intereses"
                  : item.type === "dividend"
                    ? "Dividendo"
                    : item.type === "saveback"
                      ? "Saveback"
                      : "Cupon";
              const typeColor = item.type === "interest" ? "var(--module-gastos)" : "var(--module-patrimonio)";
              return (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {asset?.name ?? typeLabel}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(item.income_date).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${typeColor} 9%, transparent)`,
                        color: typeColor,
                        border: `1px solid color-mix(in srgb, ${typeColor} 19%, transparent)`,
                      }}
                    >
                      {typeLabel}
                    </span>
                    <span className="font-mono text-xs font-medium text-foreground">
                      {formatEur(item.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
