"use client";

import { BarChart2 } from "lucide-react";
import { PlatformLayout } from "@/components/modules/patrimonio/shared/PlatformLayout";
import { ComingSoonBody } from "@/components/modules/patrimonio/shared/ComingSoonBody";

export function HorosSection() {
  return (
    <PlatformLayout
      slug="horos"
      color="var(--platform-horos)"
      name="Horos"
      icon={<BarChart2 size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      <ComingSoonBody
        platformName="Horos"
        color="var(--platform-horos)"
        colorHex="#7260C4"
        type="Gestión activa value"
        progress={10}
        features={[
          "Valor liquidativo actualizado de tus participaciones",
          "Evolución histórica vs benchmark",
          "Análisis de cartera y top holdings",
          "Comisiones y rentabilidad neta",
          "Documentos y carta semestral del gestor",
        ]}
      />
    </PlatformLayout>
  );
}
