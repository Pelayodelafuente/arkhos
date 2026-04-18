"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type {
  PortfolioOverview,
  PortfolioAsset,
  PortfolioTransaction,
  SavingsPlanItem,
  PortfolioSnapshot,
  PassiveIncome,
  InvestmentPlatform,
} from "@/types/patrimonio";
import { PatrimonioDashboard } from "@/components/modules/patrimonio/dashboard/PatrimonioDashboard";
import { TRSection } from "@/components/modules/patrimonio/trade-republic/TRSection";
import { IndexaSection } from "@/components/modules/patrimonio/indexa/IndexaSection";
import { HorosSection } from "@/components/modules/patrimonio/horos/HorosSection";
import { MintosSection } from "@/components/modules/patrimonio/mintos/MintosSection";
import { CryptoSection } from "@/components/modules/patrimonio/crypto/CryptoSection";

interface PatrimonioViewProps {
  overview: PortfolioOverview;
  assets: PortfolioAsset[];
  transactions: PortfolioTransaction[];
  savingsPlan: SavingsPlanItem[];
  snapshots: PortfolioSnapshot[];
  passiveIncome: PassiveIncome[];
  platforms: InvestmentPlatform[];
}

const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

export function PatrimonioView({
  overview,
  assets,
  transactions,
  savingsPlan,
  snapshots,
  passiveIncome,
  platforms,
}: PatrimonioViewProps) {
  const setOverview = usePatrimonioStore((s) => s.setOverview);
  const setAssets = usePatrimonioStore((s) => s.setAssets);
  const setTransactions = usePatrimonioStore((s) => s.setTransactions);
  const setSavingsPlan = usePatrimonioStore((s) => s.setSavingsPlan);
  const setSnapshots = usePatrimonioStore((s) => s.setSnapshots);
  const setPassiveIncome = usePatrimonioStore((s) => s.setPassiveIncome);
  const setPlatforms = usePatrimonioStore((s) => s.setPlatforms);
  const activePlatform = usePatrimonioStore((s) => s.activePlatform);
  const privacyMode = usePatrimonioStore((s) => s.privacyMode);

  useEffect(() => {
    setOverview(overview);
    setAssets(assets);
    setTransactions(transactions);
    setSavingsPlan(savingsPlan);
    setSnapshots(snapshots);
    setPassiveIncome(passiveIncome);
    setPlatforms(platforms);
  }, [
    overview,
    assets,
    transactions,
    savingsPlan,
    snapshots,
    passiveIncome,
    platforms,
    setOverview,
    setAssets,
    setTransactions,
    setSavingsPlan,
    setSnapshots,
    setPassiveIncome,
    setPlatforms,
  ]);

  return (
    <div className={privacyMode ? "patrimonio-privacy" : undefined}>
      <AnimatePresence mode="wait">
        {activePlatform === "dashboard" && (
          <motion.div key="dashboard" {...PAGE_TRANSITION}>
            <PatrimonioDashboard />
          </motion.div>
        )}
        {activePlatform === "trade-republic" && (
          <motion.div key="tr" {...PAGE_TRANSITION}>
            <TRSection />
          </motion.div>
        )}
        {activePlatform === "indexa" && (
          <motion.div key="indexa" {...PAGE_TRANSITION}>
            <IndexaSection />
          </motion.div>
        )}
        {activePlatform === "horos" && (
          <motion.div key="horos" {...PAGE_TRANSITION}>
            <HorosSection />
          </motion.div>
        )}
        {activePlatform === "mintos" && (
          <motion.div key="mintos" {...PAGE_TRANSITION}>
            <MintosSection />
          </motion.div>
        )}
        {activePlatform === "crypto" && (
          <motion.div key="crypto" {...PAGE_TRANSITION}>
            <CryptoSection />
          </motion.div>
        )}
        {activePlatform === "all" && (
          <motion.div key="all" {...PAGE_TRANSITION}>
            <PatrimonioDashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
