"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Bell,
  RefreshCw,
  Activity,
  BarChart3,
  PieChart,
  Briefcase,
  Globe,
  AreaChart,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useMercadosStore } from "@/stores/mercados-store";
import type { MercadosTab } from "@/stores/mercados-store";

interface MercadosViewProps {
  userId: string;
  initialTab: MercadosTab;
}

const TABS: {
  id: MercadosTab;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}[] = [
  { id: "pulse", label: "Pulso Global", icon: Activity },
  { id: "macro", label: "Macro", icon: BarChart3 },
  { id: "assets", label: "Activos", icon: PieChart },
  { id: "portfolio", label: "Mi Cartera", icon: Briefcase },
];

export function MercadosView({ initialTab }: MercadosViewProps) {
  const router = useRouter();
  const { activeTab, setActiveTab, isRefreshing, setIsRefreshing, unreadAlertsCount } =
    useMercadosStore();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, setActiveTab]);

  function handleTabChange(tab: MercadosTab) {
    setActiveTab(tab);
    router.push(`/mercados?tab=${tab}`, { scroll: false });
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsRefreshing(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="animate-fade-in-up flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mercados">
            <TrendingUp size={20} strokeWidth={1.75} className="text-white" />
          </div>
          <h1 className="font-heading text-2xl text-foreground">Mercados</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:bg-sand"
            aria-label="Alertas de mercado"
          >
            <Bell size={16} strokeWidth={1.5} />
            {unreadAlertsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-mercados text-[10px] font-semibold text-white">
                {unreadAlertsCount > 9 ? "9+" : unreadAlertsCount}
              </span>
            )}
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw
              size={13}
              strokeWidth={1.75}
              className={isRefreshing ? "animate-spin" : ""}
            />
            {isRefreshing ? "Actualizando…" : "Actualizar datos"}
          </Button>
        </div>
      </div>

      {/* Tabs nav */}
      <div
        className="animate-fade-in-up flex border-b border-border"
        style={{ animationDelay: "50ms" }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={[
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === id
                ? "border-mercados text-mercados"
                : "border-transparent text-text-secondary hover:text-foreground",
            ].join(" ")}
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        {activeTab === "pulse" && <PulseTabContent />}
        {activeTab === "macro" && <MacroTabContent />}
        {activeTab === "assets" && <AssetsTabContent />}
        {activeTab === "portfolio" && <PortfolioTabContent />}
      </div>
    </div>
  );
}

const PULSE_ITEMS = [
  { label: "VIX", sub: "Fear Index" },
  { label: "Fear & Greed", sub: "Crypto" },
  { label: "DXY", sub: "USD Index" },
  { label: "EUR/USD", sub: "Forex" },
  { label: "US 10Y", sub: "Treasury" },
  { label: "XAU/USD", sub: "Gold" },
  { label: "BTC", sub: "Bitcoin" },
  { label: "Global M2", sub: "Liquidez" },
];

function PulseTabContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        8 indicadores clave del mercado global — próximamente con datos en tiempo real.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PULSE_ITEMS.map(({ label, sub }) => (
          <div
            key={label}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-tertiary">{label}</span>
              <span className="text-[10px] text-text-tertiary">{sub}</span>
            </div>
            <div className="h-5 w-20 rounded bg-sand" />
            <div className="h-3 w-12 rounded bg-sand" />
          </div>
        ))}
      </div>
    </div>
  );
}

const MACRO_CHART_HEIGHTS = [28, 42, 35, 55, 48, 38, 60, 45, 32, 50, 44, 40];

function MacroTabContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Datos macroeconómicos vía FRED — VIX histórico, M2, yields, CPI, Fed Funds.
        Próximamente.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {["VIX Histórico", "Global M2 Supply", "US Treasury Yields", "CPI & Inflación"].map(
          (name) => (
            <div key={name} className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-medium text-text-secondary">{name}</p>
              <div className="flex items-end gap-1">
                {MACRO_CHART_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-sand"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

const ASSET_CATEGORIES = [
  { label: "Crypto", icon: TrendingUp },
  { label: "Commodities", icon: Globe },
  { label: "Índices", icon: AreaChart },
  { label: "Forex", icon: TrendingDown },
] as const;

const ASSET_BAR_WIDTHS = [80, 60, 45];

function AssetsTabContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Clases de activos — Crypto, Commodities, Índices globales, Forex. Próximamente.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ASSET_CATEGORIES.map(({ label, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-text-tertiary">
              <Icon size={15} strokeWidth={1.5} />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <div className="space-y-2">
              {ASSET_BAR_WIDTHS.map((w) => (
                <div key={w} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-sand" />
                  <div className="h-2 rounded bg-sand" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioTabContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Vista integrada de tu cartera (Patrimonio) junto al contexto de mercado. Próximamente.
      </p>
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Briefcase size={32} strokeWidth={1} className="mx-auto mb-3 text-text-tertiary" />
        <p className="text-sm font-medium text-text-secondary">
          Conectado con Módulo Patrimonio
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          Verás tus posiciones junto a benchmarks y correlaciones de mercado
        </p>
      </div>
    </div>
  );
}
