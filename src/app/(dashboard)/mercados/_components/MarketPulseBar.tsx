"use client";

import { motion } from "framer-motion";
import { MarketPulseCard } from "./MarketPulseCard";
import { timeAgo } from "@/lib/mercados/formatters";

interface CachedMetricValue {
  current: number;
  change24h?: number;
  changePct24h?: number;
  history?: Array<{ date: string; value: number }>;
  label?: string;
}

interface PulseData {
  vix: CachedMetricValue;
  fearGreed: CachedMetricValue;
  dxy: CachedMetricValue;
  eurusd: CachedMetricValue;
  us10y: CachedMetricValue;
  gold: CachedMetricValue;
  bitcoin: CachedMetricValue;
  m2: CachedMetricValue;
  fetchedAt: string;
  errors: string[];
}

interface MarketPulseBarProps {
  data: PulseData | null;
  isLoading: boolean;
}

const METRIC_IDS = [
  "vix",
  "fearGreed",
  "dxy",
  "eurusd",
  "us10y",
  "gold",
  "bitcoin",
  "m2",
] as const;

type MetricId = (typeof METRIC_IDS)[number];

const METRIC_INFO: Record<MetricId, { label: string; description: string }> = {
  vix: { label: "VIX", description: "Índice de miedo del mercado de acciones" },
  fearGreed: {
    label: "Fear & Greed",
    description: "Sentimiento del mercado crypto (0=miedo, 100=codicia)",
  },
  dxy: { label: "DXY", description: "Índice de fortaleza del dólar USD" },
  eurusd: { label: "EUR/USD", description: "Tipo de cambio euro-dólar" },
  us10y: { label: "US 10Y", description: "Rendimiento del bono americano a 10 años" },
  gold: { label: "Oro", description: "Precio del oro en USD por onza troy" },
  bitcoin: { label: "Bitcoin", description: "Precio de Bitcoin en USD" },
  m2: { label: "M2 USA", description: "Masa monetaria M2 de USA" },
};

const EMPTY_METRIC: CachedMetricValue = { current: 0 };

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export function MarketPulseBar({ data, isLoading }: MarketPulseBarProps) {
  const hasErrors = (data?.errors.length ?? 0) > 0;
  const isLive = data !== null && !hasErrors;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-mercados">
          Pulso Global
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full animate-pulse ${
            isLive ? "bg-emerald-500" : "bg-border"
          }`}
          aria-label={isLive ? "Datos actualizados" : "Sin datos"}
        />
        {data?.fetchedAt && (
          <span className="ml-auto font-mono text-[10px] text-text-tertiary">
            {timeAgo(data.fetchedAt)}
          </span>
        )}
      </div>

      {/* Error banner */}
      {hasErrors && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2">
          <span aria-hidden="true">⚠️</span>
          <span className="text-[11px] text-yellow-700">
            Algunos datos no pudieron actualizarse
          </span>
        </div>
      )}

      {/* Cards grid */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {METRIC_IDS.map((id) => {
          const info = METRIC_INFO[id];
          const metricValue = data ? (data[id] ?? EMPTY_METRIC) : EMPTY_METRIC;

          return (
            <motion.div key={id} variants={cardVariants}>
              <MarketPulseCard
                metricId={id}
                label={info.label}
                description={info.description}
                value={metricValue}
                isLoading={isLoading}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
