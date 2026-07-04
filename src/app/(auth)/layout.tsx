"use client";

import { useEffect, useState } from "react";
import { ParticleCanvas } from "@/components/auth/ParticleCanvas";
import { NoiseOverlay } from "@/components/auth/NoiseOverlay";
import { AuthBrand } from "@/components/auth/AuthBrand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div
      className="auth-dark relative flex min-h-dvh flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "var(--auth-bg)" }}
    >
      {/* Rejilla técnica + glows cobre — identidad de centro de mando */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--auth-grid) 1px, transparent 1px), linear-gradient(90deg, var(--auth-grid) 1px, transparent 1px)",
          backgroundSize: "26px 26px, 26px 26px",
          maskImage:
            "radial-gradient(ellipse 90% 80% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 50%, black 30%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(212,132,90,0.12) 0%, transparent 55%), radial-gradient(ellipse 55% 50% at 50% 105%, rgba(168,92,53,0.10) 0%, transparent 55%)",
        }}
      />
      {/* Viñeta para hundir los bordes */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, var(--auth-bg-deep) 100%)",
        }}
      />

      <ParticleCanvas
        particleCount={isMobile ? 35 : 100}
        mouseInteraction={!isMobile}
        starCount={5}
        connectionDistance={120}
      />
      <NoiseOverlay />

      {/* Centered content */}
      <div className="relative z-10 flex w-full flex-col items-center px-4 py-10 md:px-0">
        <AuthBrand />

        {/* Glass panel — espresso translúcido cálido */}
        <div
          className="mt-8 w-full max-w-[420px] rounded-[22px] px-7 py-8 md:px-9 md:py-10"
          style={{
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            background: "var(--auth-panel)",
            border: "1px solid rgba(196, 174, 150, 0.30)",
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,132,90,0.05) inset, inset 0 1px 0 rgba(230,210,180,0.08)",
            animation: "auth-panel-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        <p
          className="mt-8 text-center text-[11px]"
          style={{ color: "var(--text-faint)" }}
        >
          Built by Pelayo de la Fuente
        </p>
      </div>
    </div>
  );
}
