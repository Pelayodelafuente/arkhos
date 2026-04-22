"use client";

import { useMintosStore } from "@/stores/mintos-store";
import { formatCurrency } from "@/lib/utils/format";

function fmt(v: number) {
  return formatCurrency(v, "EUR");
}

export function MintosFiscal() {
  const getFiscalData = useMintosStore((s) => s.getFiscalData);
  const deposits = useMintosStore((s) => s.deposits);

  const fiscal = getFiscalData();
  const sortedDeposits = [...deposits].sort(
    (a, b) => new Date(b.deposit_date).getTime() - new Date(a.deposit_date).getTime()
  );

  return (
    <div className="space-y-5">
      {/* Fiscal summary card */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
          Resumen Fiscal
        </h3>

        <div className="space-y-2">
          {/* Gross interest */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Intereses brutos acumulados
            </span>
            <span className="font-mono text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
              {fmt(fiscal.gross_interest)}
            </span>
          </div>

          {/* Taxes withheld */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Retenciones fiscales pagadas
            </span>
            <span className="font-mono text-sm tabular-nums" style={{ color: "#A32D2D" }}>
              -{fmt(fiscal.taxes_withheld)}
            </span>
          </div>

          {/* Commissions */}
          <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Comisiones Mintos Core
            </span>
            <span className="font-mono text-sm tabular-nums" style={{ color: "#A32D2D" }}>
              -{fmt(fiscal.commissions)}
            </span>
          </div>

          {/* Net income */}
          <div className="flex items-center justify-between py-2.5 px-3 rounded-lg mt-1" style={{ backgroundColor: "color-mix(in srgb, #3B7A57 8%, transparent)" }}>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Rendimiento neto
            </span>
            <span className="font-mono text-base font-semibold tabular-nums" style={{ color: "#3B7A57" }}>
              {fmt(fiscal.net_income)}
            </span>
          </div>
        </div>

        {/* IRPF note */}
        <div
          className="rounded-lg px-3 py-2.5 text-xs"
          style={{
            backgroundColor: "color-mix(in srgb, var(--platform-mintos) 6%, transparent)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.2))",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }}>
            <strong>Base imponible para IRPF:</strong> rendimientos del capital mobiliario. Declara el
            rendimiento neto en la Renta como rendimiento de capital mobiliario (casilla 029 o similar).
            Mintos puede proporcionar certificado fiscal anual.
          </p>
        </div>
      </div>

      {/* Deposits table */}
      {sortedDeposits.length > 0 && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          }}
        >
          <h3 className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
            Historial de Depósitos
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.2))" }}>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--text-muted)" }}>
                    Fecha
                  </th>
                  <th className="text-right py-2 px-4 font-medium" style={{ color: "var(--text-muted)" }}>
                    Importe
                  </th>
                  <th className="text-left py-2 pl-4 font-medium" style={{ color: "var(--text-muted)" }}>
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedDeposits.map((dep) => (
                  <tr
                    key={dep.id}
                    style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.08))" }}
                  >
                    <td className="py-2 pr-4 font-mono text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {new Date(dep.deposit_date).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums" style={{ color: "var(--platform-mintos)" }}>
                      {fmt(dep.amount)}
                    </td>
                    <td className="py-2 pl-4" style={{ color: "var(--text-muted)" }}>
                      {dep.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.25))" }}>
                  <td className="py-2 pr-4 font-medium text-sm" style={{ color: "var(--text-secondary)" }}>
                    Total
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {fmt(sortedDeposits.reduce((s, d) => s + d.amount, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
