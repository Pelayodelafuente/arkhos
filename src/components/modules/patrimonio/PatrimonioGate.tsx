"use client";

import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { PatrimonioOnboarding } from "@/components/modules/patrimonio/PatrimonioOnboarding";
import { PatrimonioView } from "@/components/modules/patrimonio/PatrimonioView";

/**
 * Decide qué renderizar para `/patrimonio` a partir del estado ya hidratado
 * por la megacarga única (`hydrateAllStores`, ver `lib/app-data/`): el gate
 * de onboarding (`hasPlatforms`) se resuelve server-side dentro de
 * `getAppData` y llega aquí como `onboarding` en `patrimonio-store`.
 */
export function PatrimonioGate() {
  const onboarding = usePatrimonioStore((s) => s.onboarding);
  const error = usePatrimonioStore((s) => s.error);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-text-tertiary">{error}</p>
      </div>
    );
  }

  if (onboarding) {
    return <PatrimonioOnboarding />;
  }

  return <PatrimonioView />;
}
