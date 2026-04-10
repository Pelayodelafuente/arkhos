"use client";

import { useMemo } from "react";
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

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

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
      className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs"
      style={{ boxShadow: "var(--shadow-modal)" }}
    >
      <p className="font-medium text-text-secondary">{item.month}</p>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between gap-5">
          <span style={{ color: "#3B78B0" }}>Intereses</span>
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

  const assetMap = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const totalYTD = useMemo(() => {
    const year = new Date().getFullYear().toString();
    return passiveIncome
      .filter((item) => item.income_date.startsWith(year))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [passiveIncome]);

  const monthData = useMemo(() => {
    const map = new Map<string, { interest: number; dividend: number }>();
    for (const item of passiveIncome) {
      const month = item.income_date.substring(0, 7);
      const current = map.get(month) ?? { interest: 0, dividend: 0 };
      if (item.type === "interest") current.interest += item.amount;
      else current.dividend += item.amount;
      map.set(month, current);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { interest, dividend }]) => ({ month, interest, dividend, total: interest + dividend }));
  }, [passiveIncome]);

  const recentIncome = useMemo(
    () => [...passiveIncome].sort((a, b) => b.income_date.localeCompare(a.income_date)).slice(0, 5),
    [passiveIncome]
  );

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} strokeWidth={1.75} style={{ color: "#3B78B0" }} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Ingresos Pasivos</h3>
        </div>
        <span className="font-mono text-sm font-medium" style={{ color: "var(--module-patrimonio)" }}>
          {formatEur(totalYTD)} YTD
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
                tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `${v}€`}
                tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="interest" stackId="a" fill="#3B78B0" fillOpacity={0.85} radius={[0, 0, 0, 0]} maxBarSize={24} />
              <Bar dataKey="dividend" stackId="a" fill="#2E7D6B" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-3 flex gap-5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#3B78B0" }} aria-hidden="true" />
              <span className="text-xs text-text-secondary">Intereses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#2E7D6B" }} aria-hidden="true" />
              <span className="text-xs text-text-secondary">Dividendos</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent income list */}
      {recentIncome.length > 0 && (
        <div className="border-t border-border px-5 pb-5">
          <p className="mb-3 pt-4 text-xs font-medium text-text-tertiary">Ultimos ingresos</p>
          <div className="space-y-2.5">
            {recentIncome.map((item) => {
              const asset = item.asset_id ? assetMap.get(item.asset_id) : null;
              const typeLabel =
                item.type === "interest"
                  ? "Interes"
                  : item.type === "dividend"
                    ? "Dividendo"
                    : item.type === "saveback"
                      ? "Saveback"
                      : "Cupon";
              const typeColor = item.type === "interest" ? "#3B78B0" : "var(--module-patrimonio)";
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
                        backgroundColor: `${typeColor}18`,
                        color: typeColor,
                        border: `1px solid ${typeColor}30`,
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
