"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { PatrimonioDashboard } from "@/components/modules/patrimonio/dashboard/PatrimonioDashboard";
import { TRSection } from "@/components/modules/patrimonio/trade-republic/TRSection";
import { IndexaSection } from "@/components/modules/patrimonio/indexa/IndexaSection";
import { HorosSection } from "@/components/modules/patrimonio/horos/HorosSection";
import { MintosSection } from "@/components/modules/patrimonio/mintos/MintosSection";
import { CryptoSection } from "@/components/modules/patrimonio/crypto/CryptoSection";
import { UniversalSearch } from "@/components/modules/patrimonio/shared/UniversalSearch";

const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

export function PatrimonioView() {
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

  const activePlatform = usePatrimonioStore((s) => s.activePlatform);
  const privacyMode = usePatrimonioStore((s) => s.privacyMode);

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
