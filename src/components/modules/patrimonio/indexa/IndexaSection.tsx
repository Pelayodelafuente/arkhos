"use client";

import { useEffect, useRef } from "react";
import { TrendingUp } from "lucide-react";
import { PlatformLayout } from "@/components/modules/patrimonio/shared/PlatformLayout";
import { useIndexaStore } from "@/stores/indexa-store";
import { loadIndexaData } from "@/app/actions/indexa";
import { IndexaDashboard } from "./IndexaDashboard";

export function IndexaSection() {
  const setOverview = useIndexaStore((s) => s.setOverview);
  const setFunds = useIndexaStore((s) => s.setFunds);
  const setPositions = useIndexaStore((s) => s.setPositions);
  const setTransactions = useIndexaStore((s) => s.setTransactions);
  const setMonthlyReturns = useIndexaStore((s) => s.setMonthlyReturns);
  const setPlan = useIndexaStore((s) => s.setPlan);
  const setIsLoading = useIndexaStore((s) => s.setIsLoading);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    setIsLoading(true);
    loadIndexaData()
      .then((data) => {
        if (!data) return;
        setFunds(data.funds);
        setPositions(data.positions);
        setOverview(data.overview);
        setTransactions(data.transactions);
        setMonthlyReturns(data.monthlyReturns);
        setPlan(data.plan);
      })
      .finally(() => setIsLoading(false));
  }, [setFunds, setIsLoading, setMonthlyReturns, setOverview, setPlan, setPositions, setTransactions]);

  return (
    <PlatformLayout
      slug="indexa"
      color="var(--platform-indexa)"
      name="Indexa Capital"
      icon={<TrendingUp size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      <IndexaDashboard />
    </PlatformLayout>
  );
}
