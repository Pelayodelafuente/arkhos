"use client";

const MODULE_DOTS = [
  { color: "#C4704A", label: "Proyectos", delay: "0.6s" },
  { color: "#9B7A4A", label: "Mercados", delay: "0.75s" },
  { color: "#5B8C6A", label: "Patrimonio", delay: "0.9s" },
  { color: "#4A7A9B", label: "Gastos", delay: "1.05s" },
];

interface AnimatedLogoProps {
  compact?: boolean;
}

export function AnimatedLogo({ compact = false }: AnimatedLogoProps) {
  const iconSize = compact ? 48 : 72;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Orbital system */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: compact ? 160 : 280,
          height: compact ? 160 : 280,
        }}
      >
        {/* Orbit rings */}
        {!compact && (
          <>
            <div className="auth-orbit auth-orbit-1" />
            <div className="auth-orbit auth-orbit-2" />
            <div className="auth-orbit auth-orbit-3" />
          </>
        )}
        {compact && (
          <>
            <div className="auth-orbit auth-orbit-1-compact" />
            <div className="auth-orbit auth-orbit-2-compact" />
          </>
        )}

        {/* Orbs on orbits */}
        {!compact && (
          <>
            <div className="auth-orb-track auth-orb-track-1">
              <div className="auth-orb" style={{ width: 4, height: 4 }} />
            </div>
            <div className="auth-orb-track auth-orb-track-2">
              <div className="auth-orb" style={{ width: 3, height: 3 }} />
            </div>
            <div className="auth-orb-track auth-orb-track-3">
              <div className="auth-orb" style={{ width: 3, height: 3 }} />
            </div>
            <div className="auth-orb-track auth-orb-track-4">
              <div className="auth-orb" style={{ width: 2, height: 2 }} />
            </div>
          </>
        )}

        {/* Floating logo */}
        <div className="auth-logo-float absolute">
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 72 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: "drop-shadow(0 0 30px rgba(196, 112, 74, 0.35))",
            }}
          >
            <path
              d="M36 6 L6 62 L18 62 L36 26 L54 62 L66 62 Z"
              stroke="#C4704A"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
            <line
              x1="15"
              y1="48"
              x2="57"
              y2="48"
              stroke="#C4704A"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="21"
              y1="38"
              x2="51"
              y2="38"
              stroke="#C4704A"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.5"
            />
            <circle
              cx="36"
              cy="18"
              r="2.5"
              fill="#C4704A"
              className="auth-vertex-pulse"
            />
          </svg>
        </div>
      </div>

      {/* Text below logo */}
      <div className={`flex flex-col items-center ${compact ? "mt-1" : "mt-2"}`}>
        <span
          className="font-heading leading-none"
          style={{
            fontSize: compact ? 22 : 32,
            color: "#FAF7F2",
          }}
        >
          Arkhos
        </span>
        {!compact && (
          <span
            className="mt-2 text-[11px] uppercase tracking-[0.2em]"
            style={{ color: "rgba(250, 247, 242, 0.3)" }}
          >
            Personal management platform
          </span>
        )}
      </div>

      {/* Module dots */}
      <div className={`flex items-center gap-3 ${compact ? "mt-3" : "mt-6"}`}>
        {MODULE_DOTS.map((dot) => (
          <div
            key={dot.label}
            className="auth-module-dot auth-fade-in-up"
            style={
              {
                "--dot-color": dot.color,
                animationDelay: dot.delay,
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: dot.color,
              } as React.CSSProperties
            }
            title={dot.label}
          />
        ))}
      </div>
    </div>
  );
}
