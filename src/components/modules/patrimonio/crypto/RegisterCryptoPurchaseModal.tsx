"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { addCryptoTransactionAction } from "@/app/actions/crypto";
import { useCryptoStore } from "@/stores/crypto-store";
import type { CryptoAsset, CryptoTransaction } from "@/types/crypto";

interface PurchaseForm {
  date: string;
  quantity: string;
  price_eur: string;
  fee_eur: string;
}

const EMPTY_FORM: PurchaseForm = {
  date: new Date().toISOString().split("T")[0],
  quantity: "",
  price_eur: "",
  fee_eur: "",
};

interface SectionData {
  symbol: "BTC" | "ETH" | "USDC";
  label: string;
  showPrice: boolean;
}

const SECTIONS: SectionData[] = [
  { symbol: "BTC", label: "Bitcoin (BTC)", showPrice: true },
  { symbol: "ETH", label: "Ethereum (ETH)", showPrice: true },
  { symbol: "USDC", label: "USDC (Aave)", showPrice: false },
];

interface RegisterCryptoPurchaseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function RegisterCryptoPurchaseModal({
  onClose,
  onSuccess,
}: RegisterCryptoPurchaseModalProps) {
  const assets = useCryptoStore((s) => s.assets);
  const transactions = useCryptoStore((s) => s.transactions);
  const setAssets = useCryptoStore((s) => s.setAssets);
  const setTransactions = useCryptoStore((s) => s.setTransactions);

  const [expanded, setExpanded] = useState<Set<string>>(new Set(["BTC"]));
  const [forms, setForms] = useState<Record<string, PurchaseForm>>({
    BTC: { ...EMPTY_FORM },
    ETH: { ...EMPTY_FORM },
    USDC: { ...EMPTY_FORM },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  function toggleSection(symbol: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  function updateForm(symbol: string, field: keyof PurchaseForm, value: string) {
    setForms((prev) => ({
      ...prev,
      [symbol]: { ...prev[symbol], [field]: value },
    }));
    // clear error on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${symbol}.${field}`];
      return next;
    });
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    let hasAny = false;

    for (const { symbol, showPrice } of SECTIONS) {
      const f = forms[symbol];
      const touched = f.quantity !== "" || f.price_eur !== "" || f.fee_eur !== "";
      if (!touched) continue;
      hasAny = true;

      if (!f.date) newErrors[`${symbol}.date`] = "Fecha requerida";
      if (!f.quantity || isNaN(parseFloat(f.quantity)))
        newErrors[`${symbol}.quantity`] = "Cantidad requerida";
      if (showPrice && (!f.price_eur || isNaN(parseFloat(f.price_eur))))
        newErrors[`${symbol}.price_eur`] = "Precio requerido";
    }

    if (!hasAny) {
      setGlobalError("Rellena al menos una sección.");
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    setGlobalError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    let hadError = false;
    const newTransactions: CryptoTransaction[] = [];
    const updatedAssets = new Map<string, CryptoAsset>();

    for (const { symbol, showPrice } of SECTIONS) {
      const f = forms[symbol];
      const touched = f.quantity !== "" || f.price_eur !== "" || f.fee_eur !== "";
      if (!touched) continue;

      const asset = assets.find((a) => a.symbol === symbol);
      if (!asset) continue;

      const qty = parseFloat(f.quantity);
      const price = showPrice ? parseFloat(f.price_eur || "1") : 1;
      const fee = parseFloat(f.fee_eur || "0");

      const result = await addCryptoTransactionAction({
        asset_id: asset.id,
        transaction_date: f.date,
        type: "buy",
        quantity: qty,
        price_eur: price,
        amount_eur: qty * price,
        fee_eur: fee,
        exchange: symbol === "USDC" ? "aave" : "manual",
        tx_hash: null,
        notes: null,
        source: "manual",
        external_id: null,
      });

      if (!result.ok) {
        hadError = true;
        setGlobalError(result.error ?? "Error al guardar transacción");
        continue;
      }

      if (result.transaction) newTransactions.push(result.transaction);
      if (result.asset) updatedAssets.set(result.asset.id, result.asset);
    }

    if (!hadError) {
      // Actualiza el store directamente con lo devuelto por la Server Action
      // (sin volver a pedir todos los datos — la megacarga ya no se repite al navegar)
      if (newTransactions.length > 0) {
        setTransactions(
          [...transactions, ...newTransactions].sort(
            (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
          )
        );
      }
      if (updatedAssets.size > 0) {
        setAssets(assets.map((a) => updatedAssets.get(a.id) ?? a));
      }
      onSuccess?.();
      onClose();
    }

    setIsSubmitting(false);
  }

  return (
    <Modal open onClose={onClose} title="Registrar compra del mes">
      <div className="space-y-3">
        {SECTIONS.map(({ symbol, label, showPrice }) => {
          const isOpen = expanded.has(symbol);
          const f = forms[symbol];

          return (
            <div
              key={symbol}
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
              }}
            >
              {/* Accordion header */}
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors duration-150"
                style={{
                  backgroundColor: isOpen
                    ? "color-mix(in srgb, var(--platform-crypto) 6%, var(--bg-card))"
                    : "var(--bg-card)",
                  color: "var(--text-primary)",
                }}
                onClick={() => toggleSection(symbol)}
                aria-expanded={isOpen}
              >
                <span>{label}</span>
                {isOpen ? (
                  <ChevronDown size={15} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
                )}
              </button>

              {/* Accordion body */}
              {isOpen && (
                <div
                  className="px-4 pb-4 pt-3 space-y-3"
                  style={{ backgroundColor: "var(--bg-card)" }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label
                        htmlFor={`${symbol}-date`}
                        className="block text-xs mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Fecha
                      </label>
                      <Input
                        id={`${symbol}-date`}
                        type="date"
                        value={f.date}
                        onChange={(e) => updateForm(symbol, "date", e.target.value)}
                      />
                      {errors[`${symbol}.date`] && (
                        <p className="text-xs mt-1" style={{ color: "#A32D2D" }}>
                          {errors[`${symbol}.date`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`${symbol}-qty`}
                        className="block text-xs mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Cantidad ({symbol})
                      </label>
                      <Input
                        id={`${symbol}-qty`}
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={f.quantity}
                        onChange={(e) => updateForm(symbol, "quantity", e.target.value)}
                      />
                      {errors[`${symbol}.quantity`] && (
                        <p className="text-xs mt-1" style={{ color: "#A32D2D" }}>
                          {errors[`${symbol}.quantity`]}
                        </p>
                      )}
                    </div>

                    {showPrice && (
                      <div>
                        <label
                          htmlFor={`${symbol}-price`}
                          className="block text-xs mb-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Precio pagado (€)
                        </label>
                        <Input
                          id={`${symbol}-price`}
                          type="number"
                          step="any"
                          placeholder="0,00"
                          value={f.price_eur}
                          onChange={(e) => updateForm(symbol, "price_eur", e.target.value)}
                        />
                        {errors[`${symbol}.price_eur`] && (
                          <p className="text-xs mt-1" style={{ color: "#A32D2D" }}>
                            {errors[`${symbol}.price_eur`]}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor={`${symbol}-fee`}
                        className="block text-xs mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Fee (€)
                      </label>
                      <Input
                        id={`${symbol}-fee`}
                        type="number"
                        step="any"
                        placeholder="0,00"
                        value={f.fee_eur}
                        onChange={(e) => updateForm(symbol, "fee_eur", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {globalError && (
          <p
            className="text-sm rounded-lg px-3 py-2"
            style={{
              backgroundColor: "rgba(163,45,45,0.08)",
              color: "#A32D2D",
              border: "1px solid rgba(163,45,45,0.18)",
            }}
            role="alert"
          >
            {globalError}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              backgroundColor: "var(--platform-crypto)",
              color: "#fff",
            }}
          >
            {isSubmitting ? "Guardando…" : "Guardar compras"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
