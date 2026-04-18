"use client";

import { TrendingUp } from "lucide-react";
import { PlatformLayout } from "@/components/modules/patrimonio/shared/PlatformLayout";
import { ComingSoonBody } from "@/components/modules/patrimonio/shared/ComingSoonBody";

export function IndexaSection() {
  return (
    <PlatformLayout
      slug="indexa"
      color="var(--platform-indexa)"
      name="Indexa Capital"
      icon={<TrendingUp size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      <ComingSoonBody
        platformName="Indexa Capital"
        color="var(--platform-indexa)"
        colorHex="#3B78B0"
        type="Fondos indexados globales"
        progress={15}
        features={[
          "Evolución del valor de tus fondos",
          "Distribución por activos y geografías",
          "Comparativa de rentabilidad vs benchmark",
          "Historial de aportaciones",
          "Informe fiscal anual",
        ]}
      />
    </PlatformLayout>
  );
}
