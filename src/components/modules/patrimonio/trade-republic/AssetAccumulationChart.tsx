"use client";

import { useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { C } from "@/lib/patrimonio/chart-colors";
import type { PortfolioTransaction } from "@/types/patrimonio";

interface RechartsTooltipPayloadItem {
  payload?: ChartPoint;
  value?: number;
  name?: string;
  dataKey?: string;
}

interface RechartsTooltipProps {
  active?: boolean;
  payload?: RechartsTooltipPayloadItem[];
  label?: string;
}

interface AssetAccumulationChartProps {
  transactions: PortfolioTransaction[];
  assetName: string;
}

interface ChartPoint {
  date: string;
  dateLabel: string;
  quantity: number;
  invested: number;
  txType: string;
  txPrice: number | null;
}

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const TX_LABELS: Record<string, string> = {
  buy: "Compra",
  savings_plan: "Plan ahorro",
  sell: "Venta",
  saveback: "Saveback",
  dividend: "Dividendo",
  transfer_in: "Entrada",
  transfer_out: "Salida",
};

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return dateStr;
  }
}

function CustomTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-modal)",
      }}
    >
      <p className="mb-1 font-medium" style={{ color: "var(--foreground)" }}>
        {point.dateLabel}
      </p>
      <p style={{ color: "var(--text-secondary)" }}>
        Tipo:{" "}
        <span style={{ color: "var(--foreground)" }}>
          {TX_LABELS[point.txType] ?? point.txType}
        </span>
      </p>
      <p style={{ color: "var(--text-secondary)" }}>
        Cantidad acum.:{" "}
        <span className="font-mono" style={{ color: "var(--foreground)" }}>
          {point.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })}
        </span>
      </p>
      <p style={{ color: "var(--text-secondary)" }}>
        Total invertido:{" "}
        <span className="font-mono" style={{ color: "var(--module-patrimonio)" }}>
          {fmt.format(point.invested)}
        </span>
      </p>
      {point.txPrice != null && (
        <p style={{ color: "var(--text-secondary)" }}>
          Precio en tx:{" "}
          <span className="font-mono" style={{ color: "var(--foreground)" }}>
            {fmt.format(point.txPrice)}
          </span>
        </p>
      )}
    </div>
  );
}

export function AssetAccumulationChart({ transactions, assetName }: AssetAccumulationChartProps) {
  const uid = useId();
  const gradQtyId = `gradQty-${uid}`;
  const gradInvestedId = `gradInvested-${uid}`;

  if (transactions.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Sin suficientes datos
        </p>
      </div>
    );
  }

  const sorted = [...transactions].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date)
  );

  let accQty = 0;
  let accInvested = 0;

  const data: ChartPoint[] = sorted.map((tx) => {
    const qty = tx.quantity ?? 0;
    const total = tx.total_amount;

    if (tx.type === "sell" || tx.type === "transfer_out") {
      accQty = Math.max(0, accQty - qty);
      accInvested = Math.max(0, accInvested - total);
    } else {
      accQty += qty;
      accInvested += total;
    }

    return {
      date: tx.transaction_date,
      dateLabel: formatDateLabel(tx.transaction_date),
      quantity: accQty,
      invested: accInvested,
      txType: tx.type,
      txPrice: tx.price_per_unit ?? null,
    };
  });

  return (
    <div>
      <p className="mb-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        Acumulación — {assetName}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradQtyId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.blue} stopOpacity={0.2} />
              <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={gradInvestedId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
              <stop offset="95%" stopColor={C.green} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: C.blue }}
            tickLine={false}
            axisLine={false}
            width={50}
            tickFormatter={(v: number) =>
              v >= 1000
                ? `${(v / 1000).toFixed(1)}k`
                : v.toLocaleString("es-ES", { maximumFractionDigits: 2 })
            }
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--module-patrimonio)" }}
            tickLine={false}
            axisLine={false}
            width={55}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k€` : `${v.toFixed(0)}€`
            }
          />
          <Tooltip
            content={<CustomTooltip />}
          />
          {sorted.map((tx) => (
            <ReferenceLine
              key={tx.id}
              x={formatDateLabel(tx.transaction_date)}
              yAxisId="left"
              stroke="var(--border)"
              strokeWidth={1}
            />
          ))}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="quantity"
            stroke={C.blue}
            strokeWidth={2}
            fill={`url(#${gradQtyId})`}
            dot={false}
            activeDot={{ r: 4, fill: C.blue }}
            name="Cantidad"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="invested"
            stroke={C.green}
            strokeWidth={2}
            fill={`url(#${gradInvestedId})`}
            dot={false}
            activeDot={{ r: 4, fill: C.green }}
            name="Invertido €"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
