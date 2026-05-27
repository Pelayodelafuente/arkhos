"use client";

import { useState } from "react";
import { Edit3, Check, X } from "lucide-react";
import { useMintosStore } from "@/stores/mintos-store";
import { updateMintosPortfolioHealth } from "@/app/actions/mintos";
import { loadMintosData } from "@/app/actions/mintos";

const fmt = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);

interface BucketState {
  amount: string;
  count: string;
}

const BUCKETS = [
  { key: "on_track",    label: "Al corriente" },
  { key: "grace",       label: "Período de gracia" },
  { key: "late_1_15",   label: "Mora 1-15 días" },
  { key: "late_16_30",  label: "Mora 16-30 días" },
  { key: "late_31_60",  label: "Mora 31-60 días" },
  { key: "default",     label: "60+ días / Impago" },
] as const;

type BucketKey = typeof BUCKETS[number]["key"];

export function MintosHealthForm() {
  const health = useMintosStore((s) => s.portfolioHealth);
  const setOverview = useMintosStore((s) => s.setOverview);
  const setDeposits = useMintosStore((s) => s.setDeposits);
  const setMonthlySnapshots = useMintosStore((s) => s.setMonthlySnapshots);
  const setPortfolioHealth = useMintosStore((s) => s.setPortfolioHealth);
  const setDistributions = useMintosStore((s) => s.setDistributions);
  const setPlan = useMintosStore((s) => s.setPlan);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<Record<BucketKey, BucketState>>({
    on_track:   { amount: "", count: "" },
    grace:      { amount: "", count: "" },
    late_1_15:  { amount: "", count: "" },
    late_16_30: { amount: "", count: "" },
    late_31_60: { amount: "", count: "" },
    default:    { amount: "", count: "" },
  });
  const [snapshotDate, setSnapshotDate] = useState("");

  function openEdit() {
    setBuckets({
      on_track:   { amount: health?.on_track_amount?.toString()   ?? "", count: health?.on_track_count?.toString()   ?? "" },
      grace:      { amount: health?.grace_period_amount?.toString() ?? "", count: health?.grace_period_count?.toString() ?? "" },
      late_1_15:  { amount: health?.late_1_15_amount?.toString()  ?? "", count: health?.late_1_15_count?.toString()  ?? "" },
      late_16_30: { amount: health?.late_16_30_amount?.toString() ?? "", count: health?.late_16_30_count?.toString() ?? "" },
      late_31_60: { amount: health?.late_31_60_amount?.toString() ?? "", count: health?.late_31_60_count?.toString() ?? "" },
      default:    { amount: health?.default_amount?.toString()    ?? "", count: health?.default_count?.toString()    ?? "" },
    });
    setSnapshotDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setEditing(true);
  }

  function setField(key: BucketKey, field: "amount" | "count", value: string) {
    setBuckets((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const res = await updateMintosPortfolioHealth({
      on_track_amount:    parseFloat(buckets.on_track.amount)   || 0,
      grace_period_amount: parseFloat(buckets.grace.amount)     || 0,
      late_1_15_amount:   parseFloat(buckets.late_1_15.amount)  || 0,
      late_16_30_amount:  parseFloat(buckets.late_16_30.amount) || 0,
      late_31_60_amount:  parseFloat(buckets.late_31_60.amount) || 0,
      default_amount:     parseFloat(buckets.default.amount)    || 0,
      on_track_count:     parseInt(buckets.on_track.count,   10) || undefined,
      grace_period_count: parseInt(buckets.grace.count,      10) || undefined,
      late_1_15_count:    parseInt(buckets.late_1_15.count,  10) || undefined,
      late_16_30_count:   parseInt(buckets.late_16_30.count, 10) || undefined,
      late_31_60_count:   parseInt(buckets.late_31_60.count, 10) || undefined,
      default_count:      parseInt(buckets.default.count,    10) || undefined,
      snapshot_date:      snapshotDate || undefined,
    });

    if (!res.success) {
      setError(res.error ?? "Error al guardar");
      setSaving(false);
      return;
    }

    const fresh = await loadMintosData();
    if (fresh) {
      setOverview(fresh.overview);
      setDeposits(fresh.deposits);
      setMonthlySnapshots(fresh.monthlySnapshots);
      setPortfolioHealth(fresh.portfolioHealth);
      setDistributions(fresh.distributions);
      setPlan(fresh.plan);
    }

    setSaving(false);
    setEditing(false);
  }

  // ── Read mode ────────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={openEdit}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
          style={{
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
            color: "var(--text-muted)",
          }}
        >
          <Edit3 size={12} />
          Actualizar salud de cartera
        </button>
      </div>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Actualizar salud de cartera
        </p>
        <div className="flex flex-col items-end gap-1">
          <label className="text-xs" style={{ color: "var(--text-muted)" }}>Fecha snapshot</label>
          <input
            type="date"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
            className="rounded-lg px-2 py-1 text-xs font-mono"
            style={{
              backgroundColor: "var(--bg-surface, var(--bg-card))",
              border: "1px solid var(--border-stone, rgba(160,120,80,0.35))",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Bucket rows */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 pb-1">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Categoría</span>
          <span className="text-xs font-medium text-right" style={{ color: "var(--text-muted)" }}>Importe (€)</span>
          <span className="text-xs font-medium text-right" style={{ color: "var(--text-muted)" }}>Préstamos</span>
        </div>
        {BUCKETS.map(({ key, label }) => (
          <div key={key} className="grid grid-cols-3 gap-2 items-center">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
            <input
              type="number"
              step="0.01"
              value={buckets[key].amount}
              onChange={(e) => setField(key, "amount", e.target.value)}
              placeholder="0.00"
              className="rounded-lg px-2 py-1.5 text-sm font-mono text-right w-full"
              style={{
                backgroundColor: "var(--bg-surface, var(--bg-card))",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.35))",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            <input
              type="number"
              step="1"
              value={buckets[key].count}
              onChange={(e) => setField(key, "count", e.target.value)}
              placeholder="0"
              className="rounded-lg px-2 py-1.5 text-sm font-mono text-right w-full"
              style={{
                backgroundColor: "var(--bg-surface, var(--bg-card))",
                border: "1px solid var(--border-stone, rgba(160,120,80,0.35))",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* Total preview */}
      {(() => {
        const total = BUCKETS.reduce((s, { key }) => s + (parseFloat(buckets[key].amount) || 0), 0);
        const loans = BUCKETS.reduce((s, { key }) => s + (parseInt(buckets[key].count, 10) || 0), 0);
        return total > 0 ? (
          <div className="flex justify-between text-sm pt-1" style={{ borderTop: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}>
            <span style={{ color: "var(--text-muted)" }}>Total</span>
            <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
              {fmt(total)} · {loans.toLocaleString("es-ES")} préstamos
            </span>
          </div>
        ) : null;
      })()}

      {error && <p className="text-xs" style={{ color: "#A32D2D" }}>{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--platform-mintos)", color: "#fff" }}
        >
          <Check size={14} />
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
            color: "var(--text-secondary)",
          }}
        >
          <X size={14} />
          Cancelar
        </button>
      </div>
    </div>
  );
}
