"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
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
import type { PulseData } from "@/lib/mercados/pulse";
import type { MacroData } from "@/lib/mercados/macro";
import type { AssetsData } from "@/lib/mercados/assets";
import type { PortfolioMarketData } from "@/lib/mercados/portfolio-market";
import type { MarketAlert } from "@/lib/mercados/alerts";
import { MarketPulseBar } from "./MarketPulseBar";
import dynamic from "next/dynamic";
import { AlertsFeed } from "./portfolio/AlertsFeed";

// F3.7 — los dashboards de cada tab cargan recharts; se difieren para sacar
// la librería de gráficos del First Load JS de /mercados
const tabLoading = () => (
  <div className="space-y-4">
    <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
    <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
  </div>
);
const MacroDashboard = dynamic(
  () => import("./macro/MacroDashboard").then((m) => ({ default: m.MacroDashboard })),
  { ssr: false, loading: tabLoading }
);
const AssetsDashboard = dynamic(
  () => import("./assets/AssetsDashboard").then((m) => ({ default: m.AssetsDashboard })),
  { ssr: false, loading: tabLoading }
);
const PortfolioDashboard = dynamic(
  () => import("./portfolio/PortfolioDashboard").then((m) => ({ default: m.PortfolioDashboard })),
  { ssr: false, loading: tabLoading }
);
import { AIChatPanel } from "./AIChatPanel";
import { DailySummary } from "./DailySummary";

interface AlertsResponse {
  alerts: MarketAlert[];
  unreadCount: number;
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

const VALID_TABS: MercadosTab[] = ["pulse", "macro", "assets", "portfolio"];

export function MercadosView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: MercadosTab = VALID_TABS.includes(tabParam as MercadosTab)
    ? (tabParam as MercadosTab)
    : "pulse";

  const activeTab = useMercadosStore((s) => s.activeTab);
  const setActiveTab = useMercadosStore((s) => s.setActiveTab);
  const setLastUpdated = useMercadosStore((s) => s.setLastUpdated);
  const storeSetIsRefreshing = useMercadosStore((s) => s.setIsRefreshing);
  const pulseData = useMercadosStore((s) => s.pulseData);
  const setPulseData = useMercadosStore((s) => s.setPulseData);
  const macroData = useMercadosStore((s) => s.macroData);
  const setMacroData = useMercadosStore((s) => s.setMacroData);
  const assetsData = useMercadosStore((s) => s.assetsData);
  const setAssetsData = useMercadosStore((s) => s.setAssetsData);
  const portfolioData = useMercadosStore((s) => s.portfolioData);
  const setPortfolioData = useMercadosStore((s) => s.setPortfolioData);
  const alerts = useMercadosStore((s) => s.alerts);
  const setAlerts = useMercadosStore((s) => s.setAlerts);
  const unreadAlertsCount = useMercadosStore((s) => s.unreadAlertsCount);
  const setUnreadAlertsCount = useMercadosStore((s) => s.setUnreadAlertsCount);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAlertsFeedOpen, setIsAlertsFeedOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, setActiveTab]);

  async function refreshAlerts() {
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
  }

  function handleTabChange(tab: MercadosTab) {
    setActiveTab(tab);
    router.push(`/mercados?tab=${tab}`, { scroll: false });
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    storeSetIsRefreshing(true);
    try {
      const pulsePromise = fetch("/api/mercados/pulse?refresh=true")
        .then((res) => (res.ok ? (res.json() as Promise<PulseData>) : null))
        .then((data) => {
          if (data) {
            setPulseData(data);
            setLastUpdated(new Date(data.fetchedAt));
          }
        })
        .catch(() => {
          // Network error — keep existing data
        });

      if (activeTab === "macro") {
        const macroPromise = fetch("/api/mercados/macro?refresh=true")
          .then((res) => (res.ok ? (res.json() as Promise<MacroData>) : null))
          .then((data) => {
            if (data) setMacroData(data);
          })
          .catch(() => {
            // Network error
          });
        await Promise.all([pulsePromise, macroPromise]);
      } else if (activeTab === "assets") {
        const assetsPromise = fetch("/api/mercados/assets?refresh=true")
          .then((res) => (res.ok ? (res.json() as Promise<AssetsData>) : null))
          .then((data) => {
            if (data) setAssetsData(data);
          })
          .catch(() => {
            // Network error
          });
        await Promise.all([pulsePromise, assetsPromise]);
      } else if (activeTab === "portfolio") {
        const portfolioPromise = fetch("/api/mercados/portfolio?refresh=true")
          .then((res) => (res.ok ? (res.json() as Promise<PortfolioMarketData>) : null))
          .then(async (data) => {
            if (data) {
              setPortfolioData(data);
              // Si hay alertas de rebalanceo warning/critical, persistirlas
              const toCreate = data.rebalanceAlerts.filter((a) => a.severity !== 'info');
              if (toCreate.length > 0) {
                await fetch('/api/mercados/alerts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'create_rebalance', alerts: toCreate }),
                });
              }
            }
          })
          .catch(() => {
            // Network error
          });
        await Promise.all([pulsePromise, portfolioPromise]);
      } else {
        await pulsePromise;
      }
      await refreshAlerts();
    } finally {
      setIsRefreshing(false);
      storeSetIsRefreshing(false);
    }
  }

  function handleMarkRead(id: string) {
    setAlerts(alerts.map(a => (a.id === id ? { ...a, is_read: true } : a)));
    setUnreadAlertsCount(Math.max(0, unreadAlertsCount - 1));
    void fetch('/api/mercados/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', alertId: id }),
    });
  }

  function handleMarkAllRead() {
    setAlerts(alerts.map(a => ({ ...a, is_read: true })));
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
      <div className="animate-fade-in-up relative z-10 flex items-center justify-end">
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
        <MarketPulseBar data={pulseData} isLoading={!pulseData} />
      </div>

      {/* DailySummary — entre Pulso Global y tabs */}
      {pulseData && (
        <div className="animate-fade-in-up" style={{ animationDelay: "75ms" }}>
          <DailySummary pulseData={pulseData} portfolioData={portfolioData} />
        </div>
      )}

      {/* Tabs nav */}
      <div
        className="animate-fade-in-up mb-2 flex border-b border-border"
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
                      label: "M2 USA (billones $)",
                      value: `$${pulseData.m2.current.toFixed(1).replace('.', ',')} T`,
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
            {!pulseData && (
              <p className="text-sm text-text-tertiary">Cargando indicadores...</p>
            )}
          </div>
        )}
        {activeTab === "macro" && (
          <MacroDashboard data={macroData} isLoading={!macroData} />
        )}
        {activeTab === "assets" && (
          <AssetsDashboard
            data={assetsData && pulseData ? {
              ...assetsData,
              crypto: { ...assetsData.crypto, fearGreed: pulseData.fearGreed.current },
            } : assetsData}
            isLoading={!assetsData}
          />
        )}
        {activeTab === "portfolio" && (
          <PortfolioDashboard data={portfolioData} isLoading={!portfolioData} />
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
