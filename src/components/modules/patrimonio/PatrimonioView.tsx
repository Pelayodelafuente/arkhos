"use client";

import { useEffect } from "react";
import { Wallet } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type {
  PortfolioOverview,
  PortfolioAsset,
  SavingsPlanItem,
  PortfolioSnapshot,
  PassiveIncome,
  InvestmentPlatform,
  PlatformSlug,
} from "@/types/patrimonio";
import { OverviewKPIs } from "@/components/modules/patrimonio/dashboard/OverviewKPIs";
import { PlatformCards } from "@/components/modules/patrimonio/dashboard/PlatformCards";
import { TRDashboard } from "@/components/modules/patrimonio/trade-republic/TRDashboard";
import { PlaceholderPlatform } from "@/components/modules/patrimonio/shared/PlaceholderPlatform";

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

interface PatrimonioViewProps {
  overview: PortfolioOverview;
  assets: PortfolioAsset[];
  savingsPlan: SavingsPlanItem[];
  snapshots: PortfolioSnapshot[];
  passiveIncome: PassiveIncome[];
  platforms: InvestmentPlatform[];
}

const PLATFORM_TABS: { slug: PlatformSlug | "all"; label: string }[] = [
  { slug: "all", label: "Vista General" },
  { slug: "trade-republic", label: "Trade Republic" },
  { slug: "crypto", label: "Cripto" },
  { slug: "indexa", label: "Indexa Capital" },
  { slug: "horos", label: "Horos" },
  { slug: "mintos", label: "Mintos" },
];

export function PatrimonioView({
  overview,
  assets,
  savingsPlan,
  snapshots,
  passiveIncome,
  platforms,
}: PatrimonioViewProps) {
  const setOverview = usePatrimonioStore((s) => s.setOverview);
  const setAssets = usePatrimonioStore((s) => s.setAssets);
  const setSavingsPlan = usePatrimonioStore((s) => s.setSavingsPlan);
  const setSnapshots = usePatrimonioStore((s) => s.setSnapshots);
  const setPassiveIncome = usePatrimonioStore((s) => s.setPassiveIncome);
  const setPlatforms = usePatrimonioStore((s) => s.setPlatforms);
  const activePlatform = usePatrimonioStore((s) => s.activePlatform);
  const setActivePlatform = usePatrimonioStore((s) => s.setActivePlatform);

  // Sync server data into store on mount
  useEffect(() => {
    setOverview(overview);
    setAssets(assets);
    setSavingsPlan(savingsPlan);
    setSnapshots(snapshots);
    setPassiveIncome(passiveIncome);
    setPlatforms(platforms);
  }, [
    overview,
    assets,
    savingsPlan,
    snapshots,
    passiveIncome,
    platforms,
    setOverview,
    setAssets,
    setSavingsPlan,
    setSnapshots,
    setPassiveIncome,
    setPlatforms,
  ]);

  // Determine which tabs to show (only platforms that exist)
  const platformSlugs = new Set(platforms.map((p) => p.slug));
  const availableTabs = PLATFORM_TABS.filter(
    (tab) => tab.slug === "all" || platformSlugs.has(tab.slug)
  );

  // Render active tab content
  function renderTabContent() {
    if (activePlatform === "all") {
      return (
        <div className="space-y-6">
          <PlatformCards />
        </div>
      );
    }

    if (activePlatform === "trade-republic") {
      return <TRDashboard />;
    }

    // Other platforms — placeholder
    const platform = platforms.find((p) => p.slug === activePlatform);
    if (!platform) return null;

    const platformAssets = assets.filter((a) => a.platform_id === platform.id);
    return <PlaceholderPlatform platform={platform} assets={platformAssets} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            backgroundColor: "rgba(46,125,107,0.12)",
            border: "1px solid rgba(46,125,107,0.25)",
          }}
        >
          <Wallet
            size={18}
            strokeWidth={1.75}
            style={{ color: "var(--module-patrimonio)" }}
            aria-label="Icono Patrimonio"
          />
        </div>
        <div>
          <h1 className="font-heading text-2xl text-foreground">Patrimonio</h1>
        </div>
        <div
          className="ml-auto rounded-full px-3 py-1 font-mono text-sm font-semibold"
          style={{
            backgroundColor: "rgba(46,125,107,0.12)",
            color: "var(--module-patrimonio)",
            border: "1px solid rgba(46,125,107,0.25)",
          }}
        >
          {formatEur(overview.total_value)}
        </div>
      </div>

      {/* KPI Cards */}
      <OverviewKPIs />

      {/* Platform Tabs */}
      <div className="flex overflow-x-auto gap-1.5 pb-1">
        {availableTabs.map((tab) => {
          const isActive = activePlatform === tab.slug;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => setActivePlatform(tab.slug as PlatformSlug | "all")}
              className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? "var(--module-patrimonio)" : "var(--bg-card)",
                color: isActive ? "white" : "var(--text-secondary)",
                border: `1px solid ${isActive ? "var(--module-patrimonio)" : "var(--border)"}`,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {renderTabContent()}
    </div>
  );
}
