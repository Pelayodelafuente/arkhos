"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";
import { loadIndexaData } from "@/app/actions/indexa";
import { loadHorosData } from "@/app/actions/horos";
import { loadCryptoData } from "@/app/actions/crypto";
import { loadMintosData } from "@/app/actions/mintos";
import type {
  PortfolioOverview,
  PortfolioAsset,
  PortfolioTransaction,
  SavingsPlanItem,
  PortfolioSnapshot,
  PassiveIncome,
  InvestmentPlatform,
} from "@/types/patrimonio";
import type { IndexaOverview, IndexaMonthlyReturn, IndexaTransaction, IndexaMonthlyPlan } from "@/types/indexa";
import type { HorosPosition } from "@/types/horos";
import type { CryptoAsset } from "@/types/crypto";
import type { MintosOverview } from "@/types/mintos";
import { PatrimonioDashboard } from "@/components/modules/patrimonio/dashboard/PatrimonioDashboard";
import { TRSection } from "@/components/modules/patrimonio/trade-republic/TRSection";
import { IndexaSection } from "@/components/modules/patrimonio/indexa/IndexaSection";
import { HorosSection } from "@/components/modules/patrimonio/horos/HorosSection";
import { MintosSection } from "@/components/modules/patrimonio/mintos/MintosSection";
import { CryptoSection } from "@/components/modules/patrimonio/crypto/CryptoSection";
import { UniversalSearch } from "@/components/modules/patrimonio/shared/UniversalSearch";

interface PatrimonioViewProps {
  overview: PortfolioOverview;
  assets: PortfolioAsset[];
  transactions: PortfolioTransaction[];
  savingsPlan: SavingsPlanItem[];
  snapshots: PortfolioSnapshot[];
  passiveIncome: PassiveIncome[];
  platforms: InvestmentPlatform[];
  indexaOverview?: IndexaOverview | null;
  indexaMonthlyReturns?: IndexaMonthlyReturn[];
  indexaTransactions?: IndexaTransaction[];
  indexaPlan?: IndexaMonthlyPlan | null;
  horosPosition?: HorosPosition | null;
  cryptoAssets?: CryptoAsset[];
  mintosOverview?: MintosOverview | null;
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
  indexaOverview,
  indexaMonthlyReturns,
  indexaTransactions,
  indexaPlan,
  horosPosition,
  cryptoAssets,
  mintosOverview,
}: PatrimonioViewProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const setOverview = usePatrimonioStore((s) => s.setOverview);
  const setAssets = usePatrimonioStore((s) => s.setAssets);
  const setTransactions = usePatrimonioStore((s) => s.setTransactions);
  const setSavingsPlan = usePatrimonioStore((s) => s.setSavingsPlan);
  const setSnapshots = usePatrimonioStore((s) => s.setSnapshots);
  const setPassiveIncome = usePatrimonioStore((s) => s.setPassiveIncome);
  const setPlatforms = usePatrimonioStore((s) => s.setPlatforms);
  const activePlatform = usePatrimonioStore((s) => s.activePlatform);
  const privacyMode = usePatrimonioStore((s) => s.privacyMode);

  const setIndexaOverview = useIndexaStore((s) => s.setOverview);
  const setIndexaMonthlyReturns = useIndexaStore((s) => s.setMonthlyReturns);
  const setIndexaTransactions = useIndexaStore((s) => s.setTransactions);
  const setIndexaPlan = useIndexaStore((s) => s.setPlan);
  const setIndexaFunds = useIndexaStore((s) => s.setFunds);
  const setIndexaPositions = useIndexaStore((s) => s.setPositions);

  const setHorosPosition = useHorosStore((s) => s.setPosition);
  const setHorosTransactions = useHorosStore((s) => s.setTransactions);
  const setHorosNavHistory = useHorosStore((s) => s.setNavHistory);
  const setHorosDistribution = useHorosStore((s) => s.setDistribution);
  const setHorosCosts = useHorosStore((s) => s.setCosts);
  const setHorosPlan = useHorosStore((s) => s.setPlan);

  const setCryptoAssets = useCryptoStore((s) => s.setAssets);
  const setCryptoTransactions = useCryptoStore((s) => s.setTransactions);
  const setCryptoDefiPositions = useCryptoStore((s) => s.setDefiPositions);
  const setCryptoMonthlyPlan = useCryptoStore((s) => s.setMonthlyPlan);

  const setMintosOverview = useMintosStore((s) => s.setOverview);
  const setMintosDeposits = useMintosStore((s) => s.setDeposits);
  const setMintosMonthlySnapshots = useMintosStore((s) => s.setMonthlySnapshots);
  const setMintosPortfolioHealth = useMintosStore((s) => s.setPortfolioHealth);
  const setMintosDistributions = useMintosStore((s) => s.setDistributions);
  const setMintosPlan = useMintosStore((s) => s.setPlan);

  // Ref to prevent full data re-load on every navigation
  const fullDataLoaded = useRef(false);

  // ── Initialize stores from SSR props (runs after first render, no network) ──
  useEffect(() => {
    setOverview(overview);
    setAssets(assets);
    setTransactions(transactions);
    setSavingsPlan(savingsPlan);
    setSnapshots(snapshots);
    setPassiveIncome(passiveIncome);
    setPlatforms(platforms);
  }, [
    overview, assets, transactions, savingsPlan, snapshots, passiveIncome, platforms,
    setOverview, setAssets, setTransactions, setSavingsPlan, setSnapshots, setPassiveIncome, setPlatforms,
  ]);

  useEffect(() => {
    if (indexaOverview !== undefined) setIndexaOverview(indexaOverview ?? null);
    if (indexaMonthlyReturns) setIndexaMonthlyReturns(indexaMonthlyReturns);
    if (indexaTransactions) setIndexaTransactions(indexaTransactions);
    if (indexaPlan !== undefined) setIndexaPlan(indexaPlan ?? null);
  }, [
    indexaOverview, indexaMonthlyReturns, indexaTransactions, indexaPlan,
    setIndexaOverview, setIndexaMonthlyReturns, setIndexaTransactions, setIndexaPlan,
  ]);

  // Initialize Horos, Crypto and Mintos card data from SSR props (no network round trip)
  useEffect(() => {
    if (horosPosition !== undefined) setHorosPosition(horosPosition ?? null);
  }, [horosPosition, setHorosPosition]);

  useEffect(() => {
    if (cryptoAssets?.length) setCryptoAssets(cryptoAssets);
  }, [cryptoAssets, setCryptoAssets]);

  useEffect(() => {
    if (mintosOverview !== undefined) setMintosOverview(mintosOverview ?? null);
  }, [mintosOverview, setMintosOverview]);

  // Load full platform data lazily (transactions, nav history, charts, etc.)
  // Runs once on mount; card data is already covered by SSR props above
  useEffect(() => {
    if (fullDataLoaded.current) return;
    fullDataLoaded.current = true;

    // Refresh Indexa overview (bypasses potential Next.js Router Cache staleness)
    // and loads positions/funds needed for price update modal
    loadIndexaData().then((data) => {
      if (!data) return;
      setIndexaFunds(data.funds);
      setIndexaPositions(data.positions);
      setIndexaOverview(data.overview);
      setIndexaMonthlyReturns(data.monthlyReturns);
      setIndexaTransactions(data.transactions);
      setIndexaPlan(data.plan);
    });

    // Load full Horos data (transactions, nav history, distribution, costs, plan)
    loadHorosData().then((data) => {
      if (!data) return;
      setHorosPosition(data.position);
      setHorosTransactions(data.transactions);
      setHorosNavHistory(data.navHistory);
      setHorosDistribution(data.distribution);
      setHorosCosts(data.costs);
      setHorosPlan(data.plan);
    });

    // Load full Crypto data (transactions, defi positions, monthly plan)
    loadCryptoData().then((data) => {
      if (!data) return;
      setCryptoAssets(data.assets);
      setCryptoTransactions(data.transactions);
      setCryptoDefiPositions(data.defiPositions);
      setCryptoMonthlyPlan(data.monthlyPlan);
    });

    // Load full Mintos data (snapshots, deposits, health, distributions, plan)
    loadMintosData().then((data) => {
      if (!data) return;
      setMintosOverview(data.overview);
      setMintosDeposits(data.deposits);
      setMintosMonthlySnapshots(data.monthlySnapshots);
      setMintosPortfolioHealth(data.portfolioHealth);
      setMintosDistributions(data.distributions);
      setMintosPlan(data.plan);
    });
  }, [
    setIndexaFunds, setIndexaPositions, setIndexaOverview, setIndexaMonthlyReturns,
    setIndexaTransactions, setIndexaPlan,
    setHorosPosition, setHorosTransactions, setHorosNavHistory, setHorosDistribution,
    setHorosCosts, setHorosPlan,
    setCryptoAssets, setCryptoTransactions, setCryptoDefiPositions, setCryptoMonthlyPlan,
    setMintosOverview, setMintosDeposits, setMintosMonthlySnapshots,
    setMintosPortfolioHealth, setMintosDistributions, setMintosPlan,
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

      {/* Universal search modal (Ctrl+K / Cmd+K) */}
      <UniversalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
