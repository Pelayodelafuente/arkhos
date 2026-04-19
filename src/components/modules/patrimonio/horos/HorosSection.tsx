"use client";

import { useEffect, useRef } from "react";
import { BarChart2 } from "lucide-react";
import { PlatformLayout } from "@/components/modules/patrimonio/shared/PlatformLayout";
import { useHorosStore } from "@/stores/horos-store";
import { loadHorosData } from "@/app/actions/horos";
import { HorosDashboard } from "./HorosDashboard";

export function HorosSection() {
  const setPosition = useHorosStore((s) => s.setPosition);
  const setTransactions = useHorosStore((s) => s.setTransactions);
  const setNavHistory = useHorosStore((s) => s.setNavHistory);
  const setDistribution = useHorosStore((s) => s.setDistribution);
  const setCosts = useHorosStore((s) => s.setCosts);
  const setPlan = useHorosStore((s) => s.setPlan);
  const setIsLoading = useHorosStore((s) => s.setIsLoading);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    setIsLoading(true);
    loadHorosData()
      .then((data) => {
        if (!data) return;
        setPosition(data.position);
        setTransactions(data.transactions);
        setNavHistory(data.navHistory);
        setDistribution(data.distribution);
        setCosts(data.costs);
        setPlan(data.plan);
      })
      .finally(() => setIsLoading(false));
  }, [setPosition, setTransactions, setNavHistory, setDistribution, setCosts, setPlan, setIsLoading]);

  return (
    <PlatformLayout
      slug="horos"
      color="var(--platform-horos)"
      name="Horos"
      icon={<BarChart2 size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      <HorosDashboard />
    </PlatformLayout>
  );
}
