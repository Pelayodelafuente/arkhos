"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Copy, Check } from "lucide-react";

const HOROS_COLOR = "#7260C4";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

export function HorosFiscalPanel() {
  const [copied, setCopied] = useState(false);

  const fiscalData = {
    date: "31/12/2025",
    shares: 27.609504,
    nav: 207.943273,
    value: 5741.21,
    cost: 5400.00,
    unrealizedGain: 341.21,
    redemptions2025: 0,
    account: "841372",
    isin: "ES0146309002",
    depositary: "Caceis Bank Spain S.A.",
  };

  function copyToClipboard() {
    const text = `
DATOS FISCALES — HOROS VALUE INTERNACIONAL, FI
ISIN: ${fiscalData.isin} | Cuenta: ${fiscalData.account}
Depositario: ${fiscalData.depositary}

A 31/12/2025 (Modelo 714 — Patrimonio):
• Participaciones: ${fiscalData.shares}
• VL a 31/12/2025: ${fiscalData.nav.toFixed(6)}€
• Valor efectivo: ${fmt(fiscalData.value)}
• Coste: ${fmt(fiscalData.cost)}
• Revalorización latente: +${fmt(fiscalData.unrealizedGain)} (+${((fiscalData.unrealizedGain / fiscalData.cost) * 100).toFixed(2)}%)
• Reembolsos 2025: ${fiscalData.redemptions2025}€ (sin hecho imponible)
`.trim();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {/* Main fiscal card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          borderTop: `2px solid ${HOROS_COLOR}`,
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-heading text-sm text-foreground">Datos fiscales 2025</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              A 31/12/2025 · ISIN {fiscalData.isin}
            </p>
          </div>
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{
              backgroundColor: `color-mix(in srgb, ${HOROS_COLOR} 12%, transparent)`,
              color: HOROS_COLOR,
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copiado" : "Copiar datos"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <FiscalRow label="Participaciones a 31/12" value={fiscalData.shares.toString()} />
          <FiscalRow label="VL a 31/12/2025" value={`${fiscalData.nav.toFixed(6)}€`} />
          <FiscalRow label="Valor efectivo" value={fmt(fiscalData.value)} />
          <FiscalRow label="Coste" value={fmt(fiscalData.cost)} />
          <FiscalRow
            label="Revalorización latente"
            value={`+${fmt(fiscalData.unrealizedGain)}`}
            color="var(--platform-tr, #2E7D6B)"
          />
          <FiscalRow label="Cuenta" value={fiscalData.account} />
        </div>

        <div
          className="rounded-lg px-4 py-3 text-xs"
          style={{
            backgroundColor: "rgba(46,125,107,0.06)",
            border: "1px solid rgba(46,125,107,0.15)",
          }}
        >
          <p className="font-medium mb-0.5" style={{ color: "var(--platform-tr, #2E7D6B)" }}>
            Sin hecho imponible en 2025
          </p>
          <p style={{ color: "var(--text-secondary)" }}>
            No hubo reembolsos en 2025. La ganancia latente (+{fmt(fiscalData.unrealizedGain)}) no
            tributa hasta el momento del reembolso.
          </p>
        </div>
      </motion.div>

      {/* Model 714 guide */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.08 }}
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} style={{ color: HOROS_COLOR }} strokeWidth={1.75} />
          <h3 className="font-heading text-sm text-foreground">Declaración de patrimonio (Modelo 714)</h3>
        </div>
        <div className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <p>Introduce estos datos en tu declaración de patrimonio:</p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex gap-2">
              <span className="font-mono font-medium" style={{ color: HOROS_COLOR }}>ISIN</span>
              <span className="font-mono">{fiscalData.isin}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono font-medium" style={{ color: HOROS_COLOR }}>Depositario</span>
              <span>{fiscalData.depositary}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono font-medium" style={{ color: HOROS_COLOR }}>Nº cuenta</span>
              <span className="font-mono">{fiscalData.account}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono font-medium" style={{ color: HOROS_COLOR }}>Valor</span>
              <span className="font-mono">{fmt(fiscalData.value)} (a 31/12/2025)</span>
            </li>
          </ul>
          <p className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-page)" }}>
            El umbral del Modelo 714 es 2.000.000€. Este fondo{" "}
            <strong>no requiere declaración individual</strong> salvo que superes ese umbral.
            Sí puede contar para el cómputo total si tu patrimonio supera 700.000€ (umbral autonómico
            en muchas CC.AA.).
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function FiscalRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: "var(--bg-page)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.15))",
      }}
    >
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums" style={{ color: color ?? "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
