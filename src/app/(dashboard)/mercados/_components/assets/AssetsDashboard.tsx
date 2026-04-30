"use client";

import { useState } from "react";
import type { AssetsData } from "@/lib/mercados/assets";
import { CryptoSection } from "./CryptoSection";
import { CommoditiesSection } from "./CommoditiesSection";
import { IndicesSection } from "./IndicesSection";
import { ForexSection } from "./ForexSection";

interface Props {
  data: AssetsData | null;
  isLoading: boolean;
}

type AssetTab = "crypto" | "commodities" | "indices" | "forex";

const ASSET_TABS: { id: AssetTab; label: string }[] = [
  { id: "crypto", label: "Crypto" },
  { id: "commodities", label: "Commodities" },
  { id: "indices", label: "Índices" },
  { id: "forex", label: "Forex" },
];

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card animate-pulse ${className}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

export function AssetsDashboard({ data, isLoading }: Props) {
  const [activeTab, setActiveTab] = useState<AssetTab>("crypto");

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {/* Sub-tab nav skeleton */}
        <div className="flex gap-1 border-b border-border pb-0">
          {ASSET_TABS.map((tab) => (
            <div
              key={tab.id}
              className="h-9 w-24 rounded-t-md bg-sand animate-pulse"
            />
          ))}
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex border-b border-border">
        {ASSET_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-mercados text-mercados"
                : "border-transparent text-text-secondary hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab panels */}
      {activeTab === "crypto" && (
        <CryptoSection data={data.crypto} isLoading={false} />
      )}
      {activeTab === "commodities" && (
        <CommoditiesSection data={data.commodities} isLoading={false} />
      )}
      {activeTab === "indices" && (
        <IndicesSection data={data.indices} isLoading={false} />
      )}
      {activeTab === "forex" && (
        <ForexSection data={data.forex} isLoading={false} />
      )}
    </div>
  );
}
