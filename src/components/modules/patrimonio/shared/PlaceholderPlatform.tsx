"use client";

import { useState } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import type { InvestmentPlatform, PortfolioAsset } from "@/types/patrimonio";
import { updatePlatformValueAction } from "@/app/actions/patrimonio";
import { Button, Input, Modal } from "@/components/ui";
import { usePatrimonioStore } from "@/stores/patrimonio-store";

interface PlaceholderPlatformProps {
  platform: InvestmentPlatform;
  assets: PortfolioAsset[];
}

import { formatEur } from "@/lib/utils/format";

export function PlaceholderPlatform({ platform, assets }: PlaceholderPlatformProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const setAssets = usePatrimonioStore((s) => s.setAssets);
  const setTransactions = usePatrimonioStore((s) => s.setTransactions);
  const setSnapshots = usePatrimonioStore((s) => s.setSnapshots);
  const setOverview = usePatrimonioStore((s) => s.setOverview);

  const currentTotal = assets.reduce((sum, a) => sum + (a.current_value ?? 0), 0);

  const isCrypto = platform.slug === "crypto";

  async function handleUpdate() {
    const value = parseFloat(inputValue.replace(",", "."));
    if (isNaN(value) || value < 0) return;
    setIsUpdating(true);
    const result = await updatePlatformValueAction(platform.slug, value);
    if (result.data) {
      setAssets(result.data.assets);
      setTransactions(result.data.transactions);
      setSnapshots(result.data.snapshots);
      if (result.data.overview) setOverview(result.data.overview);
    }
    setIsUpdating(false);
    setUpdated(true);
    setModalOpen(false);
    setTimeout(() => setUpdated(false), 3000);
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `color-mix(in srgb, ${platform.color} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${platform.color} 19%, transparent)` }}
      >
        <ExternalLink size={28} strokeWidth={1.5} style={{ color: platform.color }} />
      </div>

      <h2 className="font-heading text-2xl text-foreground">{platform.name}</h2>
      <p className="mt-1 font-mono text-3xl font-semibold text-foreground">
        {formatEur(currentTotal)}
      </p>

      <div
        className="mt-4 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-text-tertiary"
        style={{ backgroundColor: "var(--bg-sand)", border: "1px solid var(--border)" }}
      >
        {isCrypto ? (
          <span>Datos en tiempo real · Proximamente</span>
        ) : (
          <>
            <span>Datos a {new Date().toLocaleDateString("es-ES")}</span>
            <span className="opacity-40">·</span>
            <span>Actualizacion manual</span>
          </>
        )}
      </div>

      {updated && (
        <p className="mt-3 text-sm" style={{ color: "var(--module-patrimonio)" }}>
          Valor actualizado correctamente
        </p>
      )}

      {!isCrypto && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-6 gap-2"
          onClick={() => setModalOpen(true)}
        >
          <RefreshCw size={14} strokeWidth={1.75} />
          Actualizar valor
        </Button>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Actualizar valor — ${platform.name}`}
      >
        <div className="space-y-4 p-1">
          <p className="text-sm text-text-secondary">
            Introduce el valor total actual de tu cartera en {platform.name}.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Valor total (EUR)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleUpdate}
              disabled={isUpdating || !inputValue}
              style={{
                backgroundColor: "var(--module-patrimonio)",
                color: "white",
                borderColor: "var(--module-patrimonio)",
              }}
            >
              {isUpdating ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
