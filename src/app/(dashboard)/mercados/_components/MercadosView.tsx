"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Bell,
  RefreshCw,
  Activity,
  BarChart3,
  PieChart,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useMercadosStore } from "@/stores/mercados-store";
import type { MercadosTab } from "@/stores/mercados-store";
import type { MacroData } from "@/lib/mercados/macro";
import type { AssetsData } from "@/lib/mercados/assets";
import { MarketPulseBar } from "./MarketPulseBar";
import { MacroDashboard } from "./macro/MacroDashboard";
import { AssetsDashboard } from "./assets/AssetsDashboard";

interface CachedMetricValue {
  current: number;
  change24h?: number;
  changePct24h?: number;
  history?: Array<{ date: string; value: number }>;
  label?: string;
}

interface PulseData {
  vix: CachedMetricValue;
  fearGreed: CachedMetricValue;
  dxy: CachedMetricValue;
  eurusd: CachedMetricValue;
  us10y: CachedMetricValue;
  gold: CachedMetricValue;
  bitcoin: CachedMetricValue;
  m2: CachedMetricValue;
  fetchedAt: string;
  errors: string[];
}

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
  const {
    activeTab,
    setActiveTab,
    unreadAlertsCount,
    setLastUpdated,
    setIsRefreshing: storeSetIsRefreshing,
  } = useMercadosStore();

  const [pulseData, setPulseData] = useState<PulseData | null>(null);
  const [isPulseLoading, setIsPulseLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [macroData, setMacroData] = useState<MacroData | null>(null);
  const [isMacroLoading, setIsMacroLoading] = useState(false);

  const [assetsData, setAssetsData] = useState<AssetsData | null>(null);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, setActiveTab]);

  const loadPulse = useCallback(
    async (forceRefresh = false) => {
      const url = forceRefresh ? "/api/mercados/pulse?refresh=true" : "/api/mercados/pulse";
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as PulseData;
          setPulseData(data);
          setLastUpdated(new Date(data.fetchedAt));
        }
      } catch {
        // Network error — keep existing data
      }
    },
    [setLastUpdated]
  );

  const loadMacro = useCallback(async (forceRefresh = false) => {
    const url = forceRefresh ? "/api/mercados/macro?refresh=true" : "/api/mercados/macro";
    setIsMacroLoading(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as MacroData;
        setMacroData(data);
      }
    } catch {
      // Network error — keep existing data
    } finally {
      setIsMacroLoading(false);
    }
  }, []);

  const loadAssets = useCallback(async (forceRefresh = false) => {
    const url = forceRefresh ? "/api/mercados/assets?refresh=true" : "/api/mercados/assets";
    setIsAssetsLoading(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as AssetsData;
        setAssetsData(data);
      }
    } catch {
      // Network error — keep existing data
    } finally {
      setIsAssetsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setIsPulseLoading(true);
      await loadPulse(false);
      setIsPulseLoading(false);
      if (initialTab === "macro") void loadMacro(false);
      if (initialTab === "assets") void loadAssets(false);
    }
    void init();
  }, [loadPulse, loadMacro, loadAssets, initialTab]);

  function handleTabChange(tab: MercadosTab) {
    setActiveTab(tab);
    router.push(`/mercados?tab=${tab}`, { scroll: false });
    if (tab === "macro" && !macroData && !isMacroLoading) void loadMacro();
    if (tab === "assets" && !assetsData && !isAssetsLoading) void loadAssets();
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    storeSetIsRefreshing(true);
    try {
      if (activeTab === "macro") {
        await Promise.all([loadPulse(true), loadMacro(true)]);
      } else if (activeTab === "assets") {
        await Promise.all([loadPulse(true), loadAssets(true)]);
      } else {
        await loadPulse(true);
      }
    } finally {
      setIsRefreshing(false);
      storeSetIsRefreshing(false);
    }
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
            onClick={() => void handleRefresh()}
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

      {/* Pulso Global — always visible */}
      <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <MarketPulseBar data={pulseData} isLoading={isPulseLoading} />
      </div>

      {/* Tabs nav */}
      <div
        className="animate-fade-in-up flex border-b border-border"
        style={{ animationDelay: "100ms" }}
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
      <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        {activeTab === "pulse" && <PulseTabContent />}
        {activeTab === "macro" && (
          <MacroDashboard data={macroData} isLoading={isMacroLoading} />
        )}
        {activeTab === "assets" && (
          <AssetsDashboard data={assetsData} isLoading={isAssetsLoading} />
        )}
        {activeTab === "portfolio" && <PortfolioTabContent />}
      </div>
    </div>
  );
}

function PulseTabContent() {
  return (
    <p className="text-sm text-text-tertiary">
      Datos macro y análisis — próximamente.
    </p>
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
