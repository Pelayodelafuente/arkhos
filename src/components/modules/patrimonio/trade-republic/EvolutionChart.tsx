"use client";

import { useId, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { C } from "@/lib/patrimonio/chart-colors";
import type { EvolutionPoint } from "@/types/patrimonio";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toFixed(0);
};

const formatMonthYear = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
};

interface TooltipPayloadItem {
  payload: EvolutionPointExtended;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  pricesLastUpdated?: string | null;
}

function CustomTooltip({ active, payload, pricesLastUpdated }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const plColor = point.pl >= 0 ? C.green : C.red;

  const dateLabel = point.isToday
    ? "Valor actual"
    : new Date(point.date).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const updatedLabel =
    point.isToday && pricesLastUpdated
      ? `· Actualizado ${new Date(pricesLastUpdated).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : null;

  return (
    <div
      className="rounded-xl border border-border px-3 py-2.5 text-xs"
      style={{ backgroundColor: "var(--bg-card)", boxShadow: "var(--shadow-modal)" }}
    >
      <p className="font-medium text-text-secondary">
        {dateLabel}
        {updatedLabel && (
          <span className="ml-1 font-normal text-text-tertiary">{updatedLabel}</span>
        )}
      </p>
      {point.isToday && (
        <p className="mb-1.5 text-xs text-text-tertiary">En tiempo real</p>
      )}
      <div className="mt-2 space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-text-tertiary">Valor</span>
          <span className="font-mono font-medium text-foreground">{formatEur(point.value)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-tertiary">Invertido</span>
          <span className="font-mono text-text-secondary">{formatEur(point.invested)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-tertiary">P&L</span>
          <span className="font-mono font-medium" style={{ color: plColor }}>
            {formatEur(point.pl)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface EvolutionPointExtended extends EvolutionPoint {
  isToday?: boolean;
}

export function EvolutionChart() {
  const uid = useId();
  const gradValue = `gradValue-${uid}`;
  const gradInvested = `gradInvested-${uid}`;
  const snapshots = usePatrimonioStore((s) => s.snapshots);
  const selectedYear = usePatrimonioStore((s) => s.selectedYear);
  const getTRCurrentValue = usePatrimonioStore((s) => s.getTRCurrentValue);
  const pricesLastUpdated = usePatrimonioStore((s) => s.pricesLastUpdated);

  const currentTRValue = getTRCurrentValue();

  const data: EvolutionPointExtended[] = useMemo(() => {
    const filtered = snapshots
      .filter((s) => selectedYear === 'all' || s.snapshot_date.startsWith(selectedYear))
      .map((s): EvolutionPointExtended => ({
        date: s.snapshot_date,
        value: s.total_value,
        invested: s.total_invested,
        pl: s.pl_amount ?? 0,
      }));

    // Append "today" point if we have a live price and it's not already in snapshots
    if (currentTRValue > 0) {
      const today = new Date().toISOString().substring(0, 10);
      const lastSnapshot = filtered[filtered.length - 1];
      if (!lastSnapshot || lastSnapshot.date !== today) {
        const lastInvested = lastSnapshot?.invested ?? 0;
        filtered.push({
          date: today,
          value: currentTRValue,
          invested: lastInvested,
          pl: currentTRValue - lastInvested,
          isToday: true,
        });
      }
    }

    return filtered;
  }, [snapshots, selectedYear, currentTRValue]);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-text-secondary">Sin historico de datos</p>
        <p className="max-w-xs text-xs text-text-tertiary">
          Los datos de evolucion se iran generando automaticamente cada dia.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={gradValue} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.green} stopOpacity={0.15} />
            <stop offset="95%" stopColor={C.green} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={gradInvested} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.border} stopOpacity={0.4} />
            <stop offset="95%" stopColor={C.border} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatMonthYear}
          tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip pricesLastUpdated={pricesLastUpdated} />} />
        <Area
          type="monotone"
          dataKey="invested"
          stroke={C.gray}
          strokeWidth={1.5}
          fill={`url(#${gradInvested})`}
          dot={false}
          activeDot={{ r: 4, fill: C.gray }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={C.green}
          strokeWidth={2}
          fill={`url(#${gradValue})`}
          dot={(props: { cx?: number; cy?: number; payload?: EvolutionPointExtended; index?: number }) => {
            const { cx, cy, payload } = props;
            if (!payload?.isToday || cx == null || cy == null) return <Dot r={0} cx={0} cy={0} />;
            return (
              <Dot
                key="today"
                cx={cx}
                cy={cy}
                r={6}
                fill={C.green}
                stroke="var(--bg-card)"
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ r: 5, fill: C.green }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
