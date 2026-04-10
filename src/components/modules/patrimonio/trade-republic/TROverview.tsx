"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Banknote, BarChart2, Calendar } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { PLBadge } from "@/components/modules/patrimonio/shared/PLBadge";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

interface StatRowProps {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  color?: string;
}

function StatRow({ label, value, sub, icon, color }: StatRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: color ? `${color}18` : "var(--bg-sand)",
            color: color ?? "var(--text-tertiary)",
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-semibold text-foreground">{value}</p>
        {sub && <div className="mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function TROverview() {
  const assets = usePatrimonioStore((s) => s.assets);
  const platforms = usePatrimonioStore((s) => s.platforms);
  const overview = usePatrimonioStore((s) => s.overview);

  const trAssets = useMemo(() => {
    const trPlatform = platforms.find((p) => p.slug === "trade-republic");
    if (!trPlatform) return [];
    return assets.filter((a) => a.platform_id === trPlatform.id);
  }, [assets, platforms]);

  const summary = useMemo(
    () => overview?.platforms.find((p) => p.platform.slug === "trade-republic") ?? null,
    [overview]
  );

  const cashAsset = trAssets.find((a) => a.category === "cash");
  const cashValue = cashAsset?.current_value ?? 0;

  const valueAssets = trAssets.filter((a) => a.category !== "cash");
  const valoresValue = valueAssets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);
  const valoresInvested = valueAssets.reduce((sum, a) => sum + a.total_invested, 0);
  const valoresPL = valoresValue - valoresInvested;
  const valoresPLPct = valoresInvested > 0 ? (valoresPL / valoresInvested) * 100 : 0;

  const ytdReturn = summary?.pl_percentage ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">Resumen Trade Republic</h3>
      </div>
      <div className="divide-y divide-border px-5">
        <StatRow
          label="Efectivo disponible"
          value={formatEur(cashValue)}
          icon={<Banknote size={14} strokeWidth={1.75} />}
          color="#3B78B0"
        />
        <StatRow
          label="Valor de la cartera"
          value={formatEur(valoresValue)}
          icon={<BarChart2 size={14} strokeWidth={1.75} />}
          color="var(--module-patrimonio)"
        />
        <StatRow
          label="Total invertido"
          value={formatEur(valoresInvested)}
          icon={<Banknote size={14} strokeWidth={1.75} />}
        />
        <StatRow
          label="P&L cartera"
          value={formatEur(valoresPL)}
          sub={
            <PLBadge
              amount={valoresPL}
              percentage={valoresPLPct}
              showPercentage
              size="sm"
            />
          }
          icon={
            valoresPL >= 0 ? (
              <TrendingUp size={14} strokeWidth={1.75} />
            ) : (
              <TrendingDown size={14} strokeWidth={1.75} />
            )
          }
          color={valoresPL >= 0 ? "var(--module-patrimonio)" : "#A32D2D"}
        />
        <StatRow
          label="Rentabilidad estimada"
          value={`${ytdReturn >= 0 ? "+" : ""}${ytdReturn.toFixed(2)}%`}
          icon={<Calendar size={14} strokeWidth={1.75} />}
          color="#B07A3A"
        />
      </div>
    </div>
  );
}
