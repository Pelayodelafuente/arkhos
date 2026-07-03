"use client";

import { Skeleton } from "@/components/ui";
import { AreaChart, Area, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatMetricValue, formatChangePct } from "@/lib/mercados/formatters";
import { Info } from "lucide-react";

const METRIC_EDUCATION: Record<string, { what: string; thresholds: string; impact: string }> = {
  vix: {
    what: 'Mide el miedo del mercado de acciones USA. A mayor VIX, más incertidumbre.',
    thresholds: '0-15: Calma · 15-25: Normal · 25-35: Tensión · +35: Pánico',
    impact: 'VIX alto puede ser oportunidad de compra a largo plazo. No vendas por impulso.',
  },
  fearGreed: {
    what: 'Sentimiento del mercado crypto (0 = miedo extremo, 100 = codicia extrema).',
    thresholds: '0-25: Miedo extremo · 25-45: Miedo · 45-55: Neutral · 55-75: Codicia · 75-100: Codicia extrema',
    impact: 'Comprar en miedo extremo y vender en codicia extrema es históricamente rentable.',
  },
  dxy: {
    what: 'Fortaleza del dólar USA vs una cesta de 6 monedas principales.',
    thresholds: 'DXY alto (>104) = dólar fuerte = presión sobre crypto, oro y emergentes',
    impact: 'Tu cartera tiene ~85% en USD. DXY alto puede ser positivo para tus retornos en EUR.',
  },
  eurusd: {
    what: 'Cuántos dólares vale un euro. Clave para tu cartera denominada en USD.',
    thresholds: 'EUR/USD alto (>1.15) = euro fuerte = tus inversiones USD valen menos en EUR',
    impact: 'Con EUR/USD en baja, tus activos USD valen más en euros. Favorable si tienes gastos en EUR.',
  },
  us10y: {
    what: 'Rendimiento del bono USA 10 años. Referencia global del coste del dinero.',
    thresholds: '<3.5%: Dinero barato · 3.5-4.5%: Normal · >4.5%: Dinero caro',
    impact: 'Tipos altos perjudican acciones growth (NVDA, GOOGL). También baja precio de bonos VDCP.',
  },
  gold: {
    what: 'Precio del oro en dólares por onza troy. Activo refugio en incertidumbre.',
    thresholds: 'No hay umbrales fijos — importa la tendencia y el ratio Oro/Plata (GSR)',
    impact: 'Tienes IGLN (ETF de oro físico) en cartera. Cada 1% de subida impacta directamente.',
  },
  bitcoin: {
    what: 'Precio de Bitcoin. Activo de mayor riesgo/retorno del mercado global.',
    thresholds: 'Sin umbrales fijos. Sigue Fear & Greed y liquidez global (M2) para contexto.',
    impact: 'BTC correlaciona con liquidez global. Tiende a subir cuando M2 crece.',
  },
  m2: {
    what: 'Cantidad total de dinero en circulación en USA (billetes + depósitos) en billones $.',
    thresholds: 'Lo importante es el cambio YoY: M2 creciendo >5% YoY históricamente precede subidas en activos de riesgo',
    impact: 'Cuando la Fed imprime más, Bitcoin y acciones suelen subir 1-2 años después.',
  },
};

interface CachedMetricValue {
  current: number;
  change24h?: number;
  changePct24h?: number;
  history?: Array<{ date: string; value: number }>;
  label?: string;
}

interface MarketPulseCardProps {
  metricId: string;
  label: string;
  description: string;
  value: CachedMetricValue;
  isLoading?: boolean;
}

function getStatusColor(metricId: string, value: number): "green" | "yellow" | "red" {
  if (metricId === "vix") {
    if (value < 15) return "green";
    if (value < 25) return "yellow";
    return "red";
  }
  if (metricId === "fearGreed") {
    if (value < 25 || value > 75) return "red";
    if (value < 45 || value > 60) return "yellow";
    return "green";
  }
  if (metricId === "dxy") {
    if (value < 100) return "green";
    if (value < 104) return "yellow";
    return "red";
  }
  if (metricId === "us10y") {
    if (value < 3.5) return "green";
    if (value < 4.5) return "yellow";
    return "red";
  }
  return "green";
}

const STATUS_DOT_CLASSES: Record<"green" | "yellow" | "red", string> = {
  green: "bg-emerald-400",
  yellow: "bg-yellow-400",
  red: "bg-red-400",
};

export function MarketPulseCard({
  metricId,
  label,
  description,
  value,
  isLoading = false,
}: MarketPulseCardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
        </div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const status = getStatusColor(metricId, value.current);
  const dotClass = STATUS_DOT_CLASSES[status];
  const hasChange = value.change24h !== undefined || value.changePct24h !== undefined;
  const changePct = value.changePct24h ?? 0;
  const isPositive = changePct >= 0;
  const displayValue = value.current === 0 ? "—" : formatMetricValue(metricId, value.current);
  const historyData = value.history ?? [];

  const sparkValues = historyData.map(h => h.value).filter(v => v > 0);
  const sparkMin = sparkValues.length > 0 ? Math.min(...sparkValues) : 0;
  const sparkMax = sparkValues.length > 0 ? Math.max(...sparkValues) : 1;
  const sparkPad = (sparkMax - sparkMin) * 0.1 || sparkMax * 0.02 || 0.01;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-background"
      title={description}
    >
      {/* Top row: label | info | status dot */}
      <div className="flex items-center gap-1">
        <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-text-secondary">
          {label}
        </span>
        {METRIC_EDUCATION[metricId] && (
          <div className="relative ml-auto mr-1 group">
            <button className="flex h-4 w-4 items-center justify-center text-text-secondary hover:text-foreground transition-colors">
              <Info size={11} strokeWidth={1.75} />
            </button>
            <div className="absolute right-0 top-5 z-50 hidden group-hover:block w-64 rounded-lg border border-border bg-white p-3 shadow-lg text-[11px] leading-relaxed space-y-2">
              <p className="text-foreground font-medium">{METRIC_EDUCATION[metricId]!.what}</p>
              <div className="border-t border-border pt-2">
                <p className="text-text-tertiary font-mono text-[10px]">{METRIC_EDUCATION[metricId]!.thresholds}</p>
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-text-secondary">{METRIC_EDUCATION[metricId]!.impact}</p>
              </div>
            </div>
          </div>
        )}
        <span
          className={`h-2 w-2 rounded-full animate-pulse ${dotClass} ${METRIC_EDUCATION[metricId] ? '' : 'ml-auto'}`}
          aria-label={`Estado: ${status}`}
        />
      </div>

      {/* Main value */}
      <span className="font-mono text-2xl font-bold leading-none text-foreground">
        {displayValue}
      </span>

      {/* Secondary label (e.g. Fear & Greed text) */}
      {value.label && (
        <span className="text-[11px] text-text-tertiary">{value.label}</span>
      )}

      {/* 24h change */}
      {hasChange && value.current !== 0 && (
        <span
          className={`flex items-center gap-0.5 font-mono text-[11px] font-medium ${
            isPositive ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isPositive ? "↑" : "↓"}
          {formatChangePct(changePct)}
        </span>
      )}

      {/* Sparkline */}
      {historyData.length > 1 && (
        <div className="mt-1 h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${metricId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--module-mercados)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--module-mercados)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[sparkMin - sparkPad, sparkMax + sparkPad]} hide />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--module-mercados)"
                strokeWidth={1.5}
                fill={`url(#grad-${metricId})`}
                dot={false}
                isAnimationActive={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(160, 120, 80, 0.35)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "var(--text-primary)",
                  padding: "4px 8px",
                }}
                itemStyle={{ color: "var(--text-secondary)" }}
                labelStyle={{ display: "none" }}
                formatter={(v) => [formatMetricValue(metricId, typeof v === 'number' ? v : 0), ""]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 14d period change */}
      {sparkValues.length > 1 && (() => {
        const first = sparkValues[0]!;
        const last = sparkValues[sparkValues.length - 1]!;
        const periodChange = first > 0 ? ((last - first) / first * 100) : 0;
        const isPos = periodChange >= 0;
        return (
          <span className={`font-mono text-[10px] ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
            14d: {isPos ? '+' : ''}{periodChange.toFixed(1)}%
          </span>
        );
      })()}
    </div>
  );
}
