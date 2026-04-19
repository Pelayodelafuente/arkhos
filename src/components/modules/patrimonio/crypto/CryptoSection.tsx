"use client";

import { useEffect, useRef } from "react";
import { Bitcoin } from "lucide-react";
import { PlatformLayout } from "@/components/modules/patrimonio/shared/PlatformLayout";
import { useCryptoStore } from "@/stores/crypto-store";
import { loadCryptoData } from "@/app/actions/crypto";
import { CryptoDashboard } from "./CryptoDashboard";

export function CryptoSection() {
  const setAssets = useCryptoStore((s) => s.setAssets);
  const setTransactions = useCryptoStore((s) => s.setTransactions);
  const setDefiPositions = useCryptoStore((s) => s.setDefiPositions);
  const setMonthlyPlan = useCryptoStore((s) => s.setMonthlyPlan);
  const setIsLoading = useCryptoStore((s) => s.setIsLoading);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    setIsLoading(true);
    loadCryptoData()
      .then((data) => {
        if (!data) return;
        setAssets(data.assets);
        setTransactions(data.transactions);
        setDefiPositions(data.defiPositions);
        setMonthlyPlan(data.monthlyPlan);
      })
      .finally(() => setIsLoading(false));
  }, [setAssets, setTransactions, setDefiPositions, setMonthlyPlan, setIsLoading]);

  return (
    <PlatformLayout
      slug="crypto"
      color="var(--platform-crypto)"
      name="Cripto"
      icon={<Bitcoin size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      <CryptoDashboard />
    </PlatformLayout>
  );
}
