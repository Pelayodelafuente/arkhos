"use client";

import { ArkhosIcon } from "@/components/ui/arkhos-icon";

export function AuthBrand() {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        animation: "auth-panel-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      {/* Logo with orbiting circles */}
      <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
        {/* Outer orbit */}
        <div
          className="absolute rounded-full"
          style={{
            width: 80,
            height: 80,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(212, 132, 90, 0.12)",
            animation: "auth-spin-cw 60s linear infinite",
          }}
        />
        {/* Inner orbit */}
        <div
          className="absolute rounded-full"
          style={{
            width: 64,
            height: 64,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(212, 132, 90, 0.08)",
            animation: "auth-spin-ccw 90s linear infinite",
          }}
        />

        {/* Icon — logo oficial (misma forma que favicon/PWA), cobre sobre fondo oscuro */}
        <ArkhosIcon
          size={52}
          color="var(--auth-copper)"
          style={{ animation: "auth-glow-pulse 3s ease-in-out infinite" }}
        />
      </div>

      {/* Text */}
      <span
        className="mt-3 font-heading leading-none"
        style={{ fontSize: 28, color: "var(--auth-text)" }}
      >
        Arkhos
      </span>
      <span
        className="mt-1.5 font-mono uppercase"
        style={{
          fontSize: 10,
          letterSpacing: "0.3em",
          color: "rgba(250, 247, 242, 0.5)",
        }}
      >
        Centro de mando personal
      </span>
    </div>
  );
}
