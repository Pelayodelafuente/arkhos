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
      className="auth-dark relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "var(--auth-bg)" }}
    >
      {/* Ambient gradient overlays */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(212,132,90,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(122,155,118,0.03) 0%, transparent 60%)",
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

        {/* Glassmorphism panel */}
        <div
          className="mt-8 w-full max-w-[420px] rounded-[20px] px-7 py-8 md:px-9 md:py-10"
          style={{
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(212, 132, 90, 0.05) inset, 0 1px 0 rgba(255, 255, 255, 0.05) inset",
            animation: "auth-panel-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        <p
          className="mt-8 text-center text-[11px]"
          style={{ color: "rgba(250, 247, 242, 0.15)" }}
        >
          Built by Pelayo de la Fuente
        </p>
      </div>
    </div>
  );
}
