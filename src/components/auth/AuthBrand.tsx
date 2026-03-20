"use client";

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

        {/* Icon */}
        <svg
          width={52}
          height={52}
          viewBox="0 0 72 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animation: "auth-glow-pulse 3s ease-in-out infinite" }}
        >
          <path
            d="M36 6 L6 62 L18 62 L36 26 L54 62 L66 62 Z"
            fill="#D4845A"
          />
          <line x1="15" y1="48" x2="57" y2="48" stroke="#07070F" strokeWidth="3" strokeLinecap="round" />
          <line x1="21" y1="38" x2="51" y2="38" stroke="#07070F" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        </svg>
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
        Personal command center
      </span>
    </div>
  );
}
