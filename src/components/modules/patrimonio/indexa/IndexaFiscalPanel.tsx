"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Copy, Check } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import type { IndexaOverview, IndexaFund, IndexaPosition } from "@/types/indexa";

import { formatEur } from "@/lib/utils/format";

// Valor real a 31/12/2025
const VALUE_31_DEC_2025 = 6491.94;
// Retención IRPF sobre ganancias de capital
const RETENTION_RATE = 0.19;
// Custodio Indexa
const CUSTODIO_NAME = "Cecabank";
const CUSTODIO_NIF = "A86436411";

interface FiscalRowProps {
  label: string;
  value: string;
  muted?: boolean;
  accent?: "warning" | "positive" | "negative";
}

function FiscalRow({ label, value, muted, accent }: FiscalRowProps) {
  const valueColor =
    accent === "warning"
      ? "var(--module-notas)"
      : accent === "negative"
      ? "var(--color-loss)"
      : accent === "positive"
      ? "var(--platform-tr, var(--color-gain))"
      : "var(--text-primary)";

  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}>
      <span className="text-xs" style={{ color: muted ? "var(--text-muted)" : "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
}

interface IndexaFiscalPanelProps {
  overview: IndexaOverview | null;
  funds: IndexaFund[];
  positions: IndexaPosition[];
  isLoading: boolean;
}

export function IndexaFiscalPanel({ overview, funds, positions, isLoading }: IndexaFiscalPanelProps) {
  const [copied, setCopied] = useState(false);

  if (isLoading || !overview) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const latentGain = overview.total_gain;
  const potentialRetention = Math.max(0, latentGain * RETENTION_RATE);

  // Estimate annual fees from positions + fund costs
  const estimatedFees = positions.reduce((sum, pos) => {
    const fund = funds.find((f) => f.id === pos.fund_id);
    const annualCost = fund?.annual_cost ?? null;
    if (annualCost !== null) {
      return sum + (pos.total_value * annualCost) / 100;
    }
    return sum;
  }, 0);

  const handleCopy = async () => {
    const text = [
      "=== DATOS FISCALES INDEXA CAPITAL ===",
      `Custodio: ${CUSTODIO_NAME} | NIF: ${CUSTODIO_NIF}`,
      `Valor a 31/12/2025: ${formatEur(VALUE_31_DEC_2025)}`,
      `Valor actual: ${formatEur(overview.total_value)}`,
      `Coste total: ${formatEur(overview.total_cost)}`,
      `Ganancia latente: ${formatEur(latentGain)}`,
      `Retención potencial (19%): ${formatEur(potentialRetention)}`,
      estimatedFees > 0 ? `Comisiones estimadas (año): ${formatEur(estimatedFees)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {/* Ganancia latente */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Situación fiscal actual
        </p>

        <FiscalRow label="Valor total de la cartera" value={formatEur(overview.total_value)} />
        <FiscalRow label="Coste total de adquisición" value={formatEur(overview.total_cost)} />
        <FiscalRow
          label="Ganancia latente"
          value={`${latentGain >= 0 ? "+" : ""}${formatEur(latentGain)}`}
          accent={latentGain > 0 ? "positive" : latentGain < 0 ? "negative" : undefined}
        />
        <FiscalRow
          label="Retención potencial (19%)"
          value={formatEur(potentialRetention)}
          accent={potentialRetention > 0 ? "warning" : undefined}
        />

        {latentGain > 0 && (
          <div
            className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
            style={{
              backgroundColor: "rgba(176,122,58,0.08)",
              border: "1px solid rgba(176,122,58,0.25)",
            }}
          >
            <AlertTriangle
              size={14}
              strokeWidth={1.75}
              className="flex-shrink-0 mt-0.5"
              style={{ color: "var(--module-notas)" }}
              aria-hidden="true"
            />
            <span style={{ color: "var(--module-notas)" }}>
              Si realizas todas las ganancias, podrías tributar{" "}
              <strong>{formatEur(potentialRetention)}</strong> en IRPF. Los fondos indexados
              se benefician del diferimiento fiscal hasta el reembolso.
            </span>
          </div>
        )}
      </div>

      {/* Custodio y datos */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Datos del custodio
        </p>
        <FiscalRow label="Custodio" value={CUSTODIO_NAME} />
        <FiscalRow label="NIF del custodio" value={CUSTODIO_NIF} />
        <FiscalRow
          label="Valor a 31/12/2025"
          value={formatEur(VALUE_31_DEC_2025)}
          muted
        />
        {estimatedFees > 0 && (
          <FiscalRow
            label="Comisiones estimadas (año)"
            value={formatEur(estimatedFees)}
            muted
          />
        )}
      </div>

      {/* Copy button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check size={14} strokeWidth={2} aria-hidden="true" />
            Copiado
          </>
        ) : (
          <>
            <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
            Copiar datos fiscales
          </>
        )}
      </Button>
    </motion.div>
  );
}
