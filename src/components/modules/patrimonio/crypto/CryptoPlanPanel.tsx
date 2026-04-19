"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui";
import { useCryptoStore } from "@/stores/crypto-store";
import { RegisterCryptoPurchaseModal } from "./RegisterCryptoPurchaseModal";
import { ImportBit2MeCSVModal } from "./ImportBit2MeCSVModal";

const formatEur = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

const WALLET_LABELS: Record<string, string> = {
  trust_wallet: "Trust Wallet",
  metamask: "MetaMask",
  bit2me: "Bit2Me",
  aave: "Aave",
};

export function CryptoPlanPanel() {
  const isLoading = useCryptoStore((s) => s.isLoading);
  const getMonthlyPlanWithAssets = useCryptoStore((s) => s.getMonthlyPlanWithAssets);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const plan = getMonthlyPlanWithAssets();
  const totalMonthly = plan.reduce((s, p) => s + p.monthly_amount_eur, 0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Plan list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}>
          <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
            Plan de aportacion mensual
          </p>
        </div>

        {plan.length === 0 ? (
          <div className="p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Sin plan configurado.
          </div>
        ) : (
          <ul role="list">
            {plan.map((item, i) => {
              const assetColor = item.asset?.color ?? "var(--platform-crypto)";
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between px-4 py-3 gap-3"
                  style={{
                    borderBottom:
                      i < plan.length - 1
                        ? "1px solid var(--border-stone, rgba(160,120,80,0.08))"
                        : "none",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: assetColor }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {item.asset?.name ?? item.asset_id ?? "Activo"}
                      </p>
                      {item.destination && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {WALLET_LABELS[item.destination] ?? item.destination}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--platform-crypto)" }}>
                      {formatEur(item.monthly_amount_eur)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      /mes
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Total row */}
        {plan.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.20))",
              backgroundColor: "color-mix(in srgb, var(--platform-crypto) 4%, var(--bg-card))",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Total mensual
            </p>
            <p className="font-mono text-base font-semibold tabular-nums" style={{ color: "var(--platform-crypto)" }}>
              {formatEur(totalMonthly)}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: "color-mix(in srgb, var(--platform-crypto) 10%, transparent)",
            color: "var(--platform-crypto)",
            border: "1px solid color-mix(in srgb, var(--platform-crypto) 20%, transparent)",
          }}
          onClick={() => setShowRegisterModal(true)}
        >
          <Plus size={15} strokeWidth={2} aria-hidden="true" />
          Registrar compra del mes
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: "color-mix(in srgb, var(--text-muted) 6%, transparent)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
          }}
          onClick={() => setShowImportModal(true)}
        >
          <Upload size={15} strokeWidth={2} aria-hidden="true" />
          Importar CSV Bit2Me
        </button>
      </div>

      {/* Modals */}
      {showRegisterModal && (
        <RegisterCryptoPurchaseModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => setShowRegisterModal(false)}
        />
      )}

      {showImportModal && (
        <ImportBit2MeCSVModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
