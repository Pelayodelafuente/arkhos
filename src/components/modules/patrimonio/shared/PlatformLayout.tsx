"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import type { PlatformSlug } from "@/types/patrimonio";

interface PlatformLayoutProps {
  slug: PlatformSlug;
  color: string;
  name: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function PlatformLayout({ color, name, icon, children }: PlatformLayoutProps) {
  const setActivePlatform = usePatrimonioStore((s) => s.setActivePlatform);
  const privacyMode = usePatrimonioStore((s) => s.privacyMode);
  const togglePrivacyMode = usePatrimonioStore((s) => s.togglePrivacyMode);
  const isLoadingPrices = usePatrimonioStore((s) => s.isLoadingPrices);
  const pricesLastUpdated = usePatrimonioStore((s) => s.pricesLastUpdated);

  const updatedTime = pricesLastUpdated
    ? new Date(pricesLastUpdated).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-5">
      {/* Back + privacy row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActivePlatform("dashboard")}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-card"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Volver al resumen"
        >
          <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
          Volver al resumen
        </button>

        <button
          type="button"
          onClick={togglePrivacyMode}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-card"
          style={{ color: "var(--text-secondary)" }}
          aria-label={privacyMode ? "Mostrar valores" : "Ocultar valores"}
        >
          {privacyMode ? <EyeOff size={15} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={15} strokeWidth={1.75} aria-hidden="true" />}
          <span className="hidden sm:inline">{privacyMode ? "Mostrar" : "Privacidad"}</span>
        </button>
      </div>

      {/* Platform header */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-xl p-4"
        style={{
          borderLeft: `3px solid ${color}`,
          backgroundColor: `color-mix(in srgb, ${color} 5%, var(--bg-card))`,
          border: `1px solid var(--border-stone, rgba(160,120,80,0.25))`,
          borderLeftColor: color,
          borderLeftWidth: "3px",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                color,
              }}
              aria-hidden="true"
            >
              {icon}
            </div>
            <div>
              <p className="font-heading text-lg text-foreground leading-tight">{name}</p>
              <p className="text-xs text-muted-foreground">Gestión de inversiones</p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            {isLoadingPrices ? (
              <span className="animate-pulse">Actualizando...</span>
            ) : updatedTime ? (
              <>
                <span
                  className="h-2 w-2 rounded-full animate-pulse"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="font-mono">Precios {updatedTime}</span>
              </>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Children */}
      {children}
    </div>
  );
}
