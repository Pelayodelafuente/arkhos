"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Bell,
  RefreshCw,
  Activity,
  BarChart3,
  PieChart,
  Briefcase,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useMercadosStore } from "@/stores/mercados-store";
import type { MercadosTab } from "@/stores/mercados-store";
import type { MacroData } from "@/lib/mercados/macro";
import type { AssetsData } from "@/lib/mercados/assets";
import type { PortfolioMarketData } from "@/lib/mercados/portfolio-market";
import type { MarketAlert } from "@/lib/mercados/alerts";
import { MarketPulseBar } from "./MarketPulseBar";
import { MacroDashboard } from "./macro/MacroDashboard";
import { AssetsDashboard } from "./assets/AssetsDashboard";
import { PortfolioDashboard } from "./portfolio/PortfolioDashboard";
import { AlertsFeed } from "./portfolio/AlertsFeed";
import { AIChatPanel } from "./AIChatPanel";

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

interface AlertsResponse {
  alerts: MarketAlert[];
  unreadCount: number;
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

  const [portfolioData, setPortfolioData] = useState<PortfolioMarketData | null>(null);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);

  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [isAlertsFeedOpen, setIsAlertsFeedOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

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
      if (res.ok) setMacroData((await res.json()) as MacroData);
    } catch {
      // Network error
    } finally {
      setIsMacroLoading(false);
    }
  }, []);

  const loadAssets = useCallback(async (forceRefresh = false) => {
    const url = forceRefresh ? "/api/mercados/assets?refresh=true" : "/api/mercados/assets";
    setIsAssetsLoading(true);
    try {
      const res = await fetch(url);
      if (res.ok) setAssetsData((await res.json()) as AssetsData);
    } catch {
      // Network error
    } finally {
      setIsAssetsLoading(false);
    }
  }, []);

  const loadPortfolio = useCallback(async (forceRefresh = false) => {
    const url = forceRefresh ? "/api/mercados/portfolio?refresh=true" : "/api/mercados/portfolio";
    setIsPortfolioLoading(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as PortfolioMarketData;
        setPortfolioData(data);
        // Si hay alertas de rebalanceo warning/critical, persistirlas
        const toCreate = data.rebalanceAlerts.filter(a => a.severity !== 'info');
        if (toCreate.length > 0) {
          void fetch('/api/mercados/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create_rebalance', alerts: toCreate }),
          });
        }
        // Refrescar conteo de alertas
        void loadAlerts();
      }
    } catch {
      // Network error
    } finally {
      setIsPortfolioLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/mercados/alerts');
      if (res.ok) {
        const data = (await res.json()) as AlertsResponse;
        setAlerts(data.alerts);
        setUnreadAlertsCount(data.unreadCount);
      }
    } catch {
      // Network error
    }
  }, []);

  useEffect(() => {
    async function init() {
      setIsPulseLoading(true);
      await loadPulse(false);
      setIsPulseLoading(false);
      if (initialTab === "macro") void loadMacro(false);
      if (initialTab === "assets") void loadAssets(false);
      if (initialTab === "portfolio") void loadPortfolio(false);
      void loadAlerts();
    }
    void init();
  }, [loadPulse, loadMacro, loadAssets, loadPortfolio, loadAlerts, initialTab]);

  function handleTabChange(tab: MercadosTab) {
    setActiveTab(tab);
    router.push(`/mercados?tab=${tab}`, { scroll: false });
    if (tab === "macro" && !macroData && !isMacroLoading) void loadMacro();
    if (tab === "assets" && !assetsData && !isAssetsLoading) void loadAssets();
    if (tab === "portfolio" && !portfolioData && !isPortfolioLoading) void loadPortfolio();
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    storeSetIsRefreshing(true);
    try {
      if (activeTab === "macro") {
        await Promise.all([loadPulse(true), loadMacro(true)]);
      } else if (activeTab === "assets") {
        await Promise.all([loadPulse(true), loadAssets(true)]);
      } else if (activeTab === "portfolio") {
        await Promise.all([loadPulse(true), loadPortfolio(true)]);
      } else {
        await loadPulse(true);
      }
      await loadAlerts();
    } finally {
      setIsRefreshing(false);
      storeSetIsRefreshing(false);
    }
  }

  function handleMarkRead(id: string) {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, is_read: true } : a)));
    setUnreadAlertsCount(prev => Math.max(0, prev - 1));
    void fetch('/api/mercados/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', alertId: id }),
    });
  }

  function handleMarkAllRead() {
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    setUnreadAlertsCount(0);
    void fetch('/api/mercados/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="animate-fade-in-up relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mercados">
            <TrendingUp size={20} strokeWidth={1.75} className="text-white" />
          </div>
          <h1 className="font-heading text-2xl text-foreground">Mercados</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Bell icon con AlertsFeed */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setIsAlertsFeedOpen(prev => !prev)}
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
            <AlertsFeed
              alerts={alerts}
              unreadCount={unreadAlertsCount}
              isOpen={isAlertsFeedOpen}
              onClose={() => setIsAlertsFeedOpen(false)}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAIPanelOpen(true)}
            className="gap-1.5"
          >
            <Bot size={13} strokeWidth={1.75} />
            IA Copiloto
          </Button>

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
        {activeTab === "pulse" && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Los 8 indicadores que determinan el clima del mercado global en este momento.
            </p>
            {pulseData && (
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      key: "vix",
                      label: "VIX — Miedo del mercado",
                      value: pulseData.vix.current.toFixed(1),
                      note:
                        pulseData.vix.current > 25
                          ? "Tensión elevada — el mercado anticipa volatilidad"
                          : pulseData.vix.current < 15
                          ? "Calma extrema — posible complacencia"
                          : "Zona neutral — volatilidad normal",
                    },
                    {
                      key: "fearGreed",
                      label: "Fear & Greed Crypto",
                      value: `${pulseData.fearGreed.current}/100${pulseData.fearGreed.label ? ` · ${pulseData.fearGreed.label}` : ""}`,
                      note:
                        pulseData.fearGreed.current < 25
                          ? "Miedo extremo — históricamente buena zona de entrada a largo plazo"
                          : pulseData.fearGreed.current > 75
                          ? "Codicia extrema — precaución, mercado sobreextendido"
                          : "Sentimiento equilibrado",
                    },
                    {
                      key: "dxy",
                      label: "DXY — Fortaleza del dólar",
                      value: pulseData.dxy.current.toFixed(2),
                      note:
                        pulseData.dxy.current > 104
                          ? "Dólar fuerte — presión sobre activos denominados en USD"
                          : pulseData.dxy.current < 100
                          ? "Dólar débil — favorable para materias primas y emergentes"
                          : "DXY en zona neutral",
                    },
                    {
                      key: "eurusd",
                      label: "EUR/USD",
                      value: pulseData.eurusd.current.toFixed(4),
                      note:
                        pulseData.eurusd.current > 1.1
                          ? "Euro fuerte — tu cartera en EUR vale menos en términos USD"
                          : pulseData.eurusd.current < 1.0
                          ? "Paridad — máxima exposición al riesgo de cambio"
                          : "Tipo de cambio en rango histórico normal",
                    },
                    {
                      key: "us10y",
                      label: "Bono USA 10 años",
                      value: `${pulseData.us10y.current.toFixed(2)}%`,
                      note:
                        pulseData.us10y.current > 4.5
                          ? "Yield alta — presión sobre valoraciones growth y renta fija"
                          : pulseData.us10y.current < 3.5
                          ? "Yield baja — favorable para acciones y duración larga"
                          : "Zona intermedia — mercado en transición",
                    },
                    {
                      key: "gold",
                      label: "Oro (XAU/USD)",
                      value: `$${pulseData.gold.current.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
                      note: "Activo de refugio — sube en incertidumbre geopolítica y debilidad del dólar. Tienes IGLN en cartera.",
                    },
                    {
                      key: "bitcoin",
                      label: "Bitcoin (BTC/USD)",
                      value: `$${pulseData.bitcoin.current.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
                      note: "Indicador de apetito de riesgo. Correlaciona con el Nasdaq en entornos de alta liquidez.",
                    },
                    {
                      key: "m2",
                      label: "M2 USA (masa monetaria)",
                      value: `$${pulseData.m2.current}T`,
                      note: "Expansión de M2 históricamente correlaciona con subidas en Bitcoin y activos de riesgo a 12-18 meses.",
                    },
                  ] as const
                ).map((item) => (
                  <div key={item.key} className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-text-secondary">{item.label}</span>
                      <span className="font-mono text-sm font-bold text-foreground">{item.value}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-text-tertiary">{item.note}</p>
                  </div>
                ))}
              </div>
            )}
            {!pulseData && isPulseLoading && (
              <p className="text-sm text-text-tertiary">Cargando indicadores...</p>
            )}
          </div>
        )}
        {activeTab === "macro" && (
          <MacroDashboard data={macroData} isLoading={isMacroLoading} />
        )}
        {activeTab === "assets" && (
          <AssetsDashboard data={assetsData} isLoading={isAssetsLoading} />
        )}
        {activeTab === "portfolio" && (
          <PortfolioDashboard data={portfolioData} isLoading={isPortfolioLoading} />
        )}
      </div>

      <AIChatPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        pulseData={pulseData}
        macroData={macroData}
        assetsData={assetsData}
        portfolioData={portfolioData}
      />
    </div>
  );
}
