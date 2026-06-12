"use client";

import { useState } from "react";
import { Modal, Button, Input, Select } from "@/components/ui";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { createAsset, updateAsset } from "@/app/actions/patrimonio";
import { useUIStore } from "@/stores/ui-store";
import {
  CATEGORY_LABELS,
  RISK_LABELS,
  type PortfolioAsset,
  type AssetCategory,
  type RiskLevel,
} from "@/types/patrimonio";

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: PortfolioAsset;
}

interface FormValues {
  name: string;
  ticker: string;
  isin: string;
  category: AssetCategory | "";
  risk_level: RiskLevel | "";
  sector: string;
  geographic_region: string;
  current_quantity: string;
  avg_buy_price: string;
  total_invested: string;
  current_price: string;
}

interface FormErrors {
  name?: string;
  isin?: string;
  category?: string;
}

const GEOGRAPHIC_REGIONS = ["Global", "USA", "Europa", "Emergentes", "China", "Taiwán", "Otro"];

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/;

function emptyForm(): FormValues {
  return {
    name: "",
    ticker: "",
    isin: "",
    category: "",
    risk_level: "",
    sector: "",
    geographic_region: "",
    current_quantity: "",
    avg_buy_price: "",
    total_invested: "",
    current_price: "",
  };
}

function assetToForm(a: PortfolioAsset): FormValues {
  return {
    name: a.name,
    ticker: a.ticker ?? "",
    isin: a.isin ?? "",
    category: a.category,
    risk_level: a.risk_level,
    sector: a.sector ?? "",
    geographic_region: a.geographic_region ?? "",
    current_quantity: a.current_quantity > 0 ? String(a.current_quantity) : "",
    avg_buy_price: a.avg_buy_price > 0 ? String(a.avg_buy_price) : "",
    total_invested: a.total_invested > 0 ? String(a.total_invested) : "",
    current_price: a.current_price != null ? String(a.current_price) : "",
  };
}

export function AssetFormModal({ isOpen, onClose, asset }: AssetFormModalProps) {
  const platforms = usePatrimonioStore((s) => s.platforms);
  const assets = usePatrimonioStore((s) => s.assets);
  const setAssets = usePatrimonioStore((s) => s.setAssets);
  const addToast = useUIStore((s) => s.addToast);

  const [form, setForm] = useState<FormValues>(asset ? assetToForm(asset) : emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const [prevSync, setPrevSync] = useState({ isOpen, asset });
  if (isOpen !== prevSync.isOpen || asset !== prevSync.asset) {
    setPrevSync({ isOpen, asset });
    if (isOpen) {
      setForm(asset ? assetToForm(asset) : emptyForm());
      setErrors({});
    }
  }

  const isEdit = Boolean(asset);

  function set(field: keyof FormValues, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto uppercase ticker
      if (field === "ticker") {
        next.ticker = value.toUpperCase();
      }

      // Auto calculate total_invested if qty and price change
      if ((field === "current_quantity" || field === "avg_buy_price") && !isEdit) {
        const qty = parseFloat(field === "current_quantity" ? value : next.current_quantity) || 0;
        const prc = parseFloat(field === "avg_buy_price" ? value : next.avg_buy_price) || 0;
        if (qty > 0 && prc > 0) {
          next.total_invested = (qty * prc).toFixed(2);
        }
      }

      return next;
    });
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "El nombre es obligatorio";
    if (!form.category) errs.category = "La categoría es obligatoria";
    if (form.isin && !ISIN_RE.test(form.isin.toUpperCase())) {
      errs.isin = "Formato inválido (2 letras + 10 alfanuméricos)";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    const trPlatform = platforms.find((p) => p.slug === "trade-republic");
    const platformId = asset?.platform_id ?? trPlatform?.id ?? "";

    const data = {
      name: form.name.trim(),
      ticker: form.ticker.trim() || undefined,
      isin: form.isin.trim().toUpperCase() || undefined,
      category: form.category as AssetCategory,
      risk_level: (form.risk_level as RiskLevel) || undefined,
      sector: form.sector.trim() || undefined,
      geographic_region: form.geographic_region || undefined,
      platform_id: platformId,
      current_quantity: form.current_quantity ? parseFloat(form.current_quantity) : undefined,
      avg_buy_price: form.avg_buy_price ? parseFloat(form.avg_buy_price) : undefined,
      total_invested: form.total_invested ? parseFloat(form.total_invested) : undefined,
      current_price: form.current_price ? parseFloat(form.current_price) : undefined,
    };

    setLoading(true);
    try {
      if (isEdit && asset) {
        // Optimistic update
        const optimisticAssets = assets.map((a) =>
          a.id === asset.id
            ? {
                ...a,
                name: data.name,
                ticker: data.ticker,
                isin: data.isin,
                category: data.category,
                risk_level: data.risk_level ?? a.risk_level,
                sector: data.sector,
                geographic_region: data.geographic_region,
                current_quantity: data.current_quantity ?? a.current_quantity,
                avg_buy_price: data.avg_buy_price ?? a.avg_buy_price,
                total_invested: data.total_invested ?? a.total_invested,
                current_price: data.current_price,
              }
            : a
        );
        setAssets(optimisticAssets);

        const result = await updateAsset(asset.id, data);
        if (!result.success) {
          setAssets(assets); // rollback
          addToast(result.error ?? "Error al actualizar el activo", "error");
          return;
        }
        addToast("Activo actualizado correctamente", "success");
      } else {
        const result = await createAsset(data);
        if (!result.success) {
          addToast(result.error ?? "Error al crear el activo", "error");
          return;
        }
        addToast("Activo creado correctamente", "success");
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const computedTotal =
    form.current_quantity && form.avg_buy_price
      ? (parseFloat(form.current_quantity) || 0) * (parseFloat(form.avg_buy_price) || 0)
      : null;

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={loading}>
        {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear activo"}
      </Button>
    </div>
  );

  const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const riskOptions = Object.entries(RISK_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const regionOptions = GEOGRAPHIC_REGIONS.map((r) => ({ value: r, label: r }));

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEdit ? "Editar activo" : "Nuevo activo"}
      footer={footer}
      className="max-w-lg"
    >
      <div className="flex flex-col gap-5">
        {/* Nombre */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Nombre <span style={{ color: "var(--module-patrimonio)" }}>*</span>
          </label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="iShares Core MSCI World"
          />
          {errors.name && (
            <p className="mt-1 text-xs" style={{ color: "var(--module-proyectos)" }}>
              {errors.name}
            </p>
          )}
        </div>

        {/* Ticker + ISIN */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Ticker
            </label>
            <Input
              value={form.ticker}
              onChange={(e) => set("ticker", e.target.value)}
              placeholder="IWDA"
              className="font-mono"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              ISIN
            </label>
            <Input
              value={form.isin}
              onChange={(e) => set("isin", e.target.value.toUpperCase())}
              placeholder="IE00B4L5Y983"
              className="font-mono"
            />
            {errors.isin && (
              <p className="mt-1 text-xs" style={{ color: "var(--module-proyectos)" }}>
                {errors.isin}
              </p>
            )}
          </div>
        </div>

        {/* Categoría + Riesgo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Categoría <span style={{ color: "var(--module-patrimonio)" }}>*</span>
            </label>
            <Select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              options={categoryOptions}
              placeholder="Seleccionar…"
            />
            {errors.category && (
              <p className="mt-1 text-xs" style={{ color: "var(--module-proyectos)" }}>
                {errors.category}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Nivel de riesgo
            </label>
            <Select
              value={form.risk_level}
              onChange={(e) => set("risk_level", e.target.value)}
              options={riskOptions}
              placeholder="Seleccionar…"
            />
          </div>
        </div>

        {/* Sector + Región */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Sector
            </label>
            <Input
              value={form.sector}
              onChange={(e) => set("sector", e.target.value)}
              placeholder="Tecnología"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Región geográfica
            </label>
            <Select
              value={form.geographic_region}
              onChange={(e) => set("geographic_region", e.target.value)}
              options={regionOptions}
              placeholder="Seleccionar…"
            />
          </div>
        </div>

        {/* Cantidades */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Cantidad actual
            </label>
            <Input
              type="number"
              step="0.00000001"
              min="0"
              value={form.current_quantity}
              onChange={(e) => set("current_quantity", e.target.value)}
              placeholder="0"
              className="font-mono"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Precio medio (€)
            </label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={form.avg_buy_price}
              onChange={(e) => set("avg_buy_price", e.target.value)}
              placeholder="0.00"
              className="font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Total invertido (€)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={
                form.total_invested !== ""
                  ? form.total_invested
                  : computedTotal != null
                  ? computedTotal.toFixed(2)
                  : ""
              }
              onChange={(e) => set("total_invested", e.target.value)}
              placeholder="0.00"
              className="font-mono"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Precio actual (€)
            </label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={form.current_price}
              onChange={(e) => set("current_price", e.target.value)}
              placeholder="0.00"
              className="font-mono"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
