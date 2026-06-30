"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { loadAppData } from "@/lib/app-data/actions";
import { hydrateAllStores } from "@/lib/app-data/hydrate-stores";
import { AppDataSplash } from "./AppDataSplash";

type LoadState = "idle" | "loading" | "ready" | "error";

interface AppDataLoaderProps {
  children: React.ReactNode;
}

/**
 * Dispara la megacarga única de datos (`loadAppData` → `hydrateAllStores`) al
 * montar el layout del dashboard, y bloquea el render de `children` hasta que
 * los stores de Zustand estén poblados.
 *
 * IMPORTANTE: no cambiar este gating a un render optimista de `children`
 * antes de `state === "ready"`. Es lo que garantiza que, tras un logout y un
 * login posterior como otro usuario, no se vean datos del usuario anterior:
 * el layout `(dashboard)` se remonta por completo en una sesión nueva, así
 * que este componente vuelve a arrancar desde `idle` y los stores no se
 * hidratan con datos viejos hasta que `loadAppData()` resuelve para el
 * usuario actual.
 */
export function AppDataLoader({ children }: AppDataLoaderProps) {
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  // Evita doble disparo de la megacarga, incluido el doble-mount de Strict
  // Mode en desarrollo.
  const hasStarted = useRef(false);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const data = await loadAppData();
      hydrateAllStores(data);
      setState("ready");
    } catch (e) {
      // `loadAppData()` puede lanzar un `redirect()` interno de Next.js (p.ej.
      // si por algún motivo no hay sesión pese al middleware) — eso no es un
      // error real, hay que dejar que Next.js lo propague y navegue.
      unstable_rethrow(e);
      setError(e instanceof Error ? e.message : "Error al cargar datos");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    void load();
  }, [load]);

  if (state === "ready") return <>{children}</>;

  if (state === "error") {
    return (
      <AppDataSplash
        status="error"
        error={error}
        onRetry={() => {
          hasStarted.current = false;
          void load();
        }}
      />
    );
  }

  return <AppDataSplash status="loading" />;
}
