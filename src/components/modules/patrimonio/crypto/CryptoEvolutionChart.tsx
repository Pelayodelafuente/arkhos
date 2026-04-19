"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

interface EvolutionPoint {
  label: string;
  invested: number;
  current_value: number;
}

function buildEvolutionData(
  transactions: ReturnType<ReturnType<typeof useCryptoStore.getState>["getTransactionsWithAsset"]>
): EvolutionPoint[] {
  const buys = transactions
    .filter((tx) => tx.type === "buy" && tx.transaction_date)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  if (buys.length === 0) return [];

  let cumulativeInvested = 0;
  let cumulativeValue = 0;

  return buys.map((tx) => {
    cumulativeInvested += tx.amount_eur ?? 0;
    cumulativeValue += tx.current_value_eur ?? tx.amount_eur ?? 0;

    const date = new Date(tx.transaction_date);
    return {
      label: date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
      invested: cumulativeInvested,
      current_value: cumulativeValue,
    };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function EvolutionTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg p-3 text-xs space-y-1"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        color: "var(--text-primary)",
        minWidth: "160px",
      }}
    >
      <p className="font-medium mb-1.5">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="font-mono flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span>{formatEur(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function CryptoEvolutionChart() {
  const isLoading = useCryptoStore((s) => s.isLoading);
  const getTransactionsWithAsset = useCryptoStore((s) => s.getTransactionsWithAsset);

  const txs = getTransactionsWithAsset();
  const data = buildEvolutionData(txs);

  if (isLoading) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  if (data.length < 2) {
    return (
      <div
        className="rounded-xl p-6 flex items-center justify-center"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          minHeight: "320px",
          color: "var(--text-muted)",
        }}
      >
        <p className="text-sm">Datos insuficientes para mostrar la evolucion del portfolio.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
        Evolucion del portfolio
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B07A3A" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#B07A3A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2E7D6B" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#2E7D6B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("es-ES", {
                notation: "compact",
                maximumFractionDigits: 0,
              }).format(v)
            }
          />
          <Tooltip content={<EvolutionTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", color: "var(--text-muted)" }}
          />
          <Area
            type="stepAfter"
            dataKey="invested"
            name="Invertido"
            stroke="#B07A3A"
            strokeWidth={1.75}
            fill="url(#gradInvested)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="current_value"
            name="Valor actual"
            stroke="#2E7D6B"
            strokeWidth={1.75}
            fill="url(#gradValue)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
