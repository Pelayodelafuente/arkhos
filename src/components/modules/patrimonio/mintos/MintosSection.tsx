"use client";

import { Coins } from "lucide-react";
import { PlatformLayout } from "@/components/modules/patrimonio/shared/PlatformLayout";
import { ComingSoonBody } from "@/components/modules/patrimonio/shared/ComingSoonBody";

export function MintosSection() {
  return (
    <PlatformLayout
      slug="mintos"
      color="var(--platform-mintos)"
      name="Mintos"
      icon={<Coins size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      <ComingSoonBody
        platformName="Mintos"
        color="var(--platform-mintos)"
        colorHex="#C4704A"
        type="P2P Lending"
        progress={10}
        features={[
          "Saldo invertido y disponible",
          "Intereses acumulados por mes",
          "Distribución por originadores y países",
          "Tasa de rendimiento neto (TIN)",
          "Historial de pagos e impagos",
        ]}
      />
    </PlatformLayout>
  );
}
