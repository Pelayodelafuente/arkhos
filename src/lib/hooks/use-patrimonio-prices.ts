"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PortfolioAsset, PricesResponse } from "@/types/patrimonio";

interface UsePricesReturn {
  isLoading: boolean;
  lastUpdated: string | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 60_000;
const MAX_FAILURES = 3;

export function usePatrimonioPrices(assets: PortfolioAsset[]): UsePricesReturn {
  const updateAssetPrice = usePatrimonioStore((s) => s.updateAssetPrice);
  const setIsLoadingPrices = usePatrimonioStore((s) => s.setIsLoadingPrices);
  const setPricesLastUpdated = usePatrimonioStore((s) => s.setPricesLastUpdated);
  const isLoadingPrices = usePatrimonioStore((s) => s.isLoadingPrices);
  const pricesLastUpdated = usePatrimonioStore((s) => s.pricesLastUpdated);

  const [error, setError] = useState<string | null>(null);
  const failureCount = useRef(0);
  const offline = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build set of ISINs/tickers to fetch
  const tickers = assets
    .filter((a) => a.category !== "cash" && (a.isin ?? a.ticker))
    .map((a) => a.isin ?? a.ticker ?? "")
    .filter(Boolean);

  const fetchPrices = useCallback(async () => {
    if (offline.current || tickers.length === 0) return;

    const controller = new AbortController();
    setIsLoadingPrices(true);

    try {
      const res = await fetch(`/api/patrimonio/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: PricesResponse = await res.json();
      const { prices } = json;

      if (prices && Object.keys(prices).length > 0) {
        for (const asset of assets) {
          const key = asset.isin ?? asset.ticker ?? "";
          const update = prices[key];
          if (update) {
            updateAssetPrice(asset.id, update.price, update.price);
          }
        }
        setPricesLastUpdated(new Date().toISOString());
        failureCount.current = 0;
        setError(null);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      failureCount.current += 1;
      if (failureCount.current >= MAX_FAILURES) {
        offline.current = true;
        setError("Precios no disponibles. Usando datos almacenados.");
      }
    } finally {
      setIsLoadingPrices(false);
    }

    return () => controller.abort();
  }, [assets, tickers, updateAssetPrice, setIsLoadingPrices, setPricesLastUpdated]);

  useEffect(() => {
    if (tickers.length === 0) return;

    // Initial fetch
    void fetchPrices();

    // Poll every 60s
    timerRef.current = setInterval(() => {
      void fetchPrices();
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchPrices, tickers.length]);

  return {
    isLoading: isLoadingPrices,
    lastUpdated: pricesLastUpdated,
    error,
  };
}
