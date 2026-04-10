"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PriceFetchRequest, PriceResult } from "@/lib/patrimonio/price-service";

export interface UsePatrimonioPricesReturn {
  status: "loading" | "live" | "offline" | "partial";
  lastUpdated: string | null;
  flashingAssets: string[]; // IDs de assets con cambio > 1%
  refreshNow: () => void;
}

const DESKTOP_INTERVAL_MS = 60_000;   // 60 s
const MOBILE_INTERVAL_MS  = 300_000;  // 5 min
const FLASH_DURATION_MS   = 300;

// Categories that do not have live prices
const SKIP_CATEGORIES = new Set(["fund", "p2p", "cash"]);

function getIntervalMs(): number {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
    return MOBILE_INTERVAL_MS;
  }
  return DESKTOP_INTERVAL_MS;
}

interface RouteResponse {
  prices: Record<string, PriceResult>;
  errors: string[];
  cached: boolean;
}

export function usePatrimonioPrices(): UsePatrimonioPricesReturn {
  const assets           = usePatrimonioStore((s) => s.assets);
  const updateAssetPrice = usePatrimonioStore((s) => s.updateAssetPrice);
  const setIsLoadingPrices   = usePatrimonioStore((s) => s.setIsLoadingPrices);
  const setPricesLastUpdated = usePatrimonioStore((s) => s.setPricesLastUpdated);
  const pricesLastUpdated    = usePatrimonioStore((s) => s.pricesLastUpdated);

  const [status, setStatus]               = useState<UsePatrimonioPricesReturn["status"]>("loading");
  const [flashingAssets, setFlashingAssets] = useState<string[]>([]);

  // Track consecutive failures to detect "offline"
  const failureCount  = useRef(0);
  const successCount  = useRef(0);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef      = useRef<AbortController | null>(null);

  // Build eligible requests from the current asset list
  const eligibleRequests: PriceFetchRequest[] = assets
    .filter((a) => !SKIP_CATEGORIES.has(a.category))
    .map((a) => ({
      id: a.id,
      ticker: a.ticker,
      isin: a.isin,
      category: a.category,
    }));

  const fetchOnce = useCallback(async () => {
    if (eligibleRequests.length === 0) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoadingPrices(true);

    try {
      const res = await fetch("/api/patrimonio/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: eligibleRequests }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = (await res.json()) as RouteResponse;
      const { prices, errors } = json;

      const receivedCount = Object.keys(prices).length;

      if (receivedCount > 0) {
        const newFlashing: string[] = [];

        for (const asset of assets) {
          const result = prices[asset.id];
          if (!result) continue;

          // Detect significant change (>1%)
          const prevPrice = asset.current_price ?? 0;
          if (prevPrice > 0) {
            const changePct = Math.abs((result.price - prevPrice) / prevPrice) * 100;
            if (changePct > 1) {
              newFlashing.push(asset.id);
            }
          }

          updateAssetPrice(asset.id, result.price, result.priceEur);
        }

        const ts = new Date().toISOString();
        setPricesLastUpdated(ts);
        failureCount.current = 0;
        successCount.current += 1;

        // Flash assets with >1% change
        if (newFlashing.length > 0) {
          setFlashingAssets(newFlashing);
          setTimeout(() => setFlashingAssets([]), FLASH_DURATION_MS);
        }

        // Status: partial if some assets did not come back
        if (errors.length > 0 || receivedCount < eligibleRequests.length) {
          setStatus("partial");
        } else {
          setStatus("live");
        }
      } else {
        // No prices received — could be offline or no API keys
        failureCount.current += 1;
        if (failureCount.current >= 2) {
          setStatus("offline");
        } else if (successCount.current > 0) {
          setStatus("partial");
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      failureCount.current += 1;
      if (failureCount.current >= 2) {
        setStatus("offline");
      }
    } finally {
      setIsLoadingPrices(false);
    }
  }, [assets, eligibleRequests, updateAssetPrice, setIsLoadingPrices, setPricesLastUpdated]);

  // Start / restart polling when eligible assets change
  useEffect(() => {
    if (eligibleRequests.length === 0) return;

    const interval = getIntervalMs();

    // Immediate fetch
    void fetchOnce();

    intervalRef.current = setInterval(() => {
      void fetchOnce();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleRequests.length, fetchOnce]);

  // Reconnect on online event
  useEffect(() => {
    function handleOnline() {
      failureCount.current = 0;
      void fetchOnce();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchOnce]);

  const refreshNow = useCallback(() => {
    void fetchOnce();
  }, [fetchOnce]);

  return {
    status,
    lastUpdated: pricesLastUpdated,
    flashingAssets,
    refreshNow,
  };
}
