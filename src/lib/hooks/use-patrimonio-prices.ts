"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { updateLivePrices } from "@/app/actions/patrimonio";
import type { PriceResult, ForexRates } from "@/lib/patrimonio/price-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PriceStatus = "idle" | "loading" | "live" | "partial" | "offline";

export interface UsePatrimonioPricesReturn {
  status: PriceStatus;
  lastUpdated: Date | null;
  forex: ForexRates | null;
  refreshPrices: () => Promise<void>;
  isRefreshing: boolean;
}

interface ApiResponse {
  prices: PriceResult[];
  forex: ForexRates;
  errors: string[];
  offline?: boolean;
}

const COOLDOWN_MS = 60_000; // 60s between manual refreshes

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePatrimonioPrices(): UsePatrimonioPricesReturn {
  const assets                 = usePatrimonioStore((s) => s.assets);
  const updateAssetPriceByIsin = usePatrimonioStore((s) => s.updateAssetPriceByIsin);
  const setPriceChange         = usePatrimonioStore((s) => s.setPriceChange);
  const setIsLoadingPrices     = usePatrimonioStore((s) => s.setIsLoadingPrices);
  const setPricesLastUpdated   = usePatrimonioStore((s) => s.setPricesLastUpdated);

  const [status, setStatus]           = useState<PriceStatus>("idle");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [forex, setForex]             = useState<ForexRates | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastRefreshRef  = useRef<number>(0);
  const initializedRef  = useRef(false);

  // On mount: derive lastUpdated from DB prices already in the store.
  // No API call — prices only update when the user clicks "Actualizar".
  useEffect(() => {
    if (initializedRef.current || assets.length === 0) return;
    initializedRef.current = true;

    const pricedAssets = assets.filter(
      (a) => a.isin && a.category !== "cash" && a.price_updated_at,
    );

    if (pricedAssets.length > 0) {
      const latestTs = pricedAssets.reduce<number>((max, a) => {
        const ts = a.price_updated_at ? new Date(a.price_updated_at).getTime() : 0;
        return ts > max ? ts : max;
      }, 0);
      if (latestTs > 0) {
        setLastUpdated(new Date(latestTs));
        setStatus("live");
      }
    }
  }, [assets]);

  // ---------------------------------------------------------------------------
  // Core fetch — only invoked by explicit user action
  // ---------------------------------------------------------------------------
  const fetchPrices = useCallback(async () => {
    setIsRefreshing(true);
    setIsLoadingPrices(true);
    setStatus("loading");

    try {
      const res = await fetch("/api/patrimonio/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        setStatus("offline");
        return;
      }

      const json = (await res.json()) as ApiResponse;

      if (json.offline) {
        setStatus("offline");
        return;
      }

      const { prices, forex: fxRates } = json;

      setForex(fxRates);

      if (prices.length > 0) {
        for (const p of prices) {
          updateAssetPriceByIsin(p.isin, p.priceEur);
          setPriceChange(p.isin, p.changePercent ?? null);
        }

        const now = new Date();
        setLastUpdated(now);
        setPricesLastUpdated(now.toISOString());
        lastRefreshRef.current = Date.now();

        void updateLivePrices(
          prices.map((p) => ({ isin: p.isin, priceEur: p.priceEur, updatedAt: p.updatedAt })),
        );

        const totalAssets = assets.filter(
          (a) => a.isin && a.category !== "cash",
        ).length;
        setStatus(prices.length >= totalAssets ? "live" : "partial");
      } else {
        setStatus("offline");
      }
    } catch {
      setStatus("offline");
    } finally {
      setIsRefreshing(false);
      setIsLoadingPrices(false);
    }
  }, [assets, updateAssetPriceByIsin, setPriceChange, setIsLoadingPrices, setPricesLastUpdated]);

  // ---------------------------------------------------------------------------
  // Public refresh with 60s cooldown
  // ---------------------------------------------------------------------------
  const refreshPrices = useCallback(async () => {
    const elapsed = Date.now() - lastRefreshRef.current;
    if (elapsed < COOLDOWN_MS) return;
    await fetchPrices();
  }, [fetchPrices]);

  return { status, lastUpdated, forex, refreshPrices, isRefreshing };
}
