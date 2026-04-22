"use client";

import { useEffect, useRef } from "react";
import { Coins } from "lucide-react";
import { PlatformLayout } from "@/components/modules/patrimonio/shared/PlatformLayout";
import { useMintosStore } from "@/stores/mintos-store";
import { loadMintosData } from "@/app/actions/mintos";
import { MintosDashboard } from "./MintosDashboard";

export function MintosSection() {
  const setOverview = useMintosStore((s) => s.setOverview);
  const setDeposits = useMintosStore((s) => s.setDeposits);
  const setMonthlySnapshots = useMintosStore((s) => s.setMonthlySnapshots);
  const setPortfolioHealth = useMintosStore((s) => s.setPortfolioHealth);
  const setDistributions = useMintosStore((s) => s.setDistributions);
  const setPlan = useMintosStore((s) => s.setPlan);
  const setIsLoading = useMintosStore((s) => s.setIsLoading);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    setIsLoading(true);
    loadMintosData()
      .then((data) => {
        if (!data) return;
        setOverview(data.overview);
        setDeposits(data.deposits);
        setMonthlySnapshots(data.monthlySnapshots);
        setPortfolioHealth(data.portfolioHealth);
        setDistributions(data.distributions);
        setPlan(data.plan);
      })
      .finally(() => setIsLoading(false));
  }, [setOverview, setDeposits, setMonthlySnapshots, setPortfolioHealth, setDistributions, setPlan, setIsLoading]);

  return (
    <PlatformLayout
      slug="mintos"
      color="var(--platform-mintos)"
      name="Mintos"
      icon={<Coins size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      <MintosDashboard />
    </PlatformLayout>
  );
}
