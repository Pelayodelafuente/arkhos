"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";
import { formatEur } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// FireCalculator — proyección de independencia financiera (regla del SWR)
// FIRE number = gasto anual / SWR. Proyecta cuántos años faltan con la
// aportación mensual y rentabilidad real esperada. Params en localStorage.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "patrimonio-fire-params";

interface FireParams {
  monthlyExpenses: number;
  swr: number;
  monthlyContribution: number;
  expectedReturn: number;
}

const DEFAULTS: FireParams = {
  monthlyExpenses: 2000,
  swr: 4,
  monthlyContribution: 500,
  expectedReturn: 5,
};

/** Meses hasta alcanzar target con interés compuesto mensual (cap 100 años). */
function monthsToTarget(
  current: number,
  monthly: number,
  annualRate: number,
  target: number
): number | null {
  if (current >= target) return 0;
  const r = annualRate / 100 / 12;
  let value = current;
  for (let m = 1; m <= 1200; m++) {
    value = value * (1 + r) + monthly;
    if (value >= target) return m;
  }
  return null;
}

interface ParamInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  step?: number;
  min?: number;
}

function ParamInput({ label, value, onChange, suffix, step = 1, min = 0 }: ParamInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-sand px-3 py-2">
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= min) onChange(v);
          }}
          className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
          aria-label={label}
        />
        <span className="flex-shrink-0 text-xs text-text-tertiary">{suffix}</span>
      </div>
    </div>
  );
}

export function FireCalculator() {
  const [params, setParams] = useState<FireParams>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // setState post-montaje intencionado: aplica params guardados sin afectar
      // a la hidratación (el primer render usa DEFAULTS estables). Un único ciclo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setParams({ ...DEFAULTS, ...(JSON.parse(stored) as Partial<FireParams>) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  }, [params, hydrated]);

  // ── Valor actual del patrimonio (misma fórmula que KPIs, sin cash TR) ────
  const trOverview = usePatrimonioStore((s) => s.overview);
  const indexaOverview = useIndexaStore((s) => s.overview);
  const horosPosition = useHorosStore((s) => s.position);
  const cryptoAssets = useCryptoStore((s) => s.assets);
  const cryptoDefi = useCryptoStore((s) => s.defiPositions);
  const getCryptoOverview = useCryptoStore((s) => s.getOverview);
  // Deps extra = triggers reales del getter (mismo patrón que GlobalEvolutionChart)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cryptoOverview = useMemo(() => getCryptoOverview(), [cryptoAssets, cryptoDefi, getCryptoOverview]);
  const mintosOverview = useMintosStore((s) => s.overview);

  const currentValue = useMemo(() => {
    const trVal = (trOverview?.total_value ?? 0) - (trOverview?.total_cash ?? 0);
    return (
      trVal +
      (indexaOverview?.total_value ?? 0) +
      (horosPosition?.total_value ?? 0) +
      (cryptoOverview?.total_value_eur ?? 0) +
      (mintosOverview?.total_value ?? 0)
    );
  }, [trOverview, indexaOverview, horosPosition, cryptoOverview, mintosOverview]);

  const result = useMemo(() => {
    const target = (params.monthlyExpenses * 12) / (params.swr / 100);
    const months = monthsToTarget(
      currentValue,
      params.monthlyContribution,
      params.expectedReturn,
      target
    );
    const progress = target > 0 ? Math.min((currentValue / target) * 100, 100) : 0;
    let eta: string | null = null;
    if (months !== null && months > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      eta = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(d);
    }
    return { target, months, progress, eta };
  }, [params, currentValue]);

  const set = (key: keyof FireParams) => (v: number) => setParams((p) => ({ ...p, [key]: v }));

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <div
        className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--border-stone, rgba(160,120,80,0.15))" }}
      >
        <Flame size={15} strokeWidth={1.75} style={{ color: "var(--module-patrimonio)" }} aria-hidden="true" />
        <div>
          <p className="font-heading text-base" style={{ color: "var(--text-primary)" }}>
            Independencia financiera
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Regla del SWR: patrimonio objetivo = gasto anual ÷ tasa de retirada
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_1.2fr]">
        {/* Parámetros */}
        <div className="grid grid-cols-2 gap-3">
          <ParamInput
            label="Gasto mensual"
            value={params.monthlyExpenses}
            onChange={set("monthlyExpenses")}
            suffix="€"
            step={50}
            min={100}
          />
          <ParamInput
            label="Tasa de retirada (SWR)"
            value={params.swr}
            onChange={set("swr")}
            suffix="%"
            step={0.25}
            min={1}
          />
          <ParamInput
            label="Aportación mensual"
            value={params.monthlyContribution}
            onChange={set("monthlyContribution")}
            suffix="€/mes"
            step={50}
          />
          <ParamInput
            label="Rentabilidad real anual"
            value={params.expectedReturn}
            onChange={set("expectedReturn")}
            suffix="%"
            step={0.5}
          />
        </div>

        {/* Resultado */}
        <div className="flex flex-col justify-center gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Patrimonio objetivo</p>
              <p className="font-mono text-xl font-semibold text-foreground">
                {formatEur(result.target, 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Horizonte</p>
              <p className="font-mono text-xl font-semibold" style={{ color: "var(--module-patrimonio)" }}>
                {result.months === 0
                  ? "Alcanzado"
                  : result.months === null
                    ? ">100 años"
                    : result.months < 12
                      ? `${result.months} meses`
                      : `${(result.months / 12).toFixed(1)} años`}
              </p>
              {result.eta && (
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>≈ {result.eta}</p>
              )}
            </div>
          </div>

          <div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--bg-sand)" }}
              role="progressbar"
              aria-valuenow={Math.round(result.progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso hacia la independencia financiera"
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${result.progress}%`,
                  backgroundColor: "var(--module-patrimonio)",
                }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              <span>
                Actual: <span className="font-mono">{formatEur(currentValue, 0)}</span>
              </span>
              <span className="font-mono">{result.progress.toFixed(1)}%</span>
            </div>
          </div>

          <p className="text-[10px] leading-snug" style={{ color: "var(--text-tertiary)" }}>
            La rentabilidad es real (descontada la inflación), por lo que el objetivo se expresa
            en euros de hoy. Proyección orientativa, no es asesoramiento financiero.
          </p>
        </div>
      </div>
    </div>
  );
}
