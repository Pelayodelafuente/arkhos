"use client";

import { Bitcoin } from "lucide-react";
import { PlatformLayout } from "@/components/modules/patrimonio/shared/PlatformLayout";
import { ComingSoonBody } from "@/components/modules/patrimonio/shared/ComingSoonBody";

export function CryptoSection() {
  return (
    <PlatformLayout
      slug="crypto"
      color="var(--platform-crypto)"
      name="Cripto"
      icon={<Bitcoin size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      <ComingSoonBody
        platformName="Cripto"
        color="var(--platform-crypto)"
        colorHex="#B07A3A"
        type="Criptomonedas"
        progress={5}
        features={[
          "Cartera de tokens con precio en tiempo real",
          "P&L por activo y global",
          "Evolución histórica del portfolio",
          "Seguimiento de staking y yield",
          "Tributación y cálculo de ganancias",
        ]}
      />
    </PlatformLayout>
  );
}
