import { ParticleCanvas } from "@/components/auth/ParticleCanvas";
import { AnimatedLogo } from "@/components/auth/AnimatedLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ═══ Desktop layout: split 50/50 ═══ */}
      <div className="hidden min-h-screen lg:flex">
        {/* Left panel — cosmic */}
        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden"
          style={{ backgroundColor: "#08080D" }}
        >
          {/* Ambient gradient overlays */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(196,112,74,0.07) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(122,155,118,0.04) 0%, transparent 60%)",
            }}
          />

          <ParticleCanvas particleCount={100} />

          <div className="relative z-10">
            <AnimatedLogo />
          </div>

          <p
            className="absolute bottom-7 left-0 right-0 text-center text-[11px]"
            style={{ color: "rgba(250, 247, 242, 0.15)" }}
          >
            Built by Pelayo de la Fuente
          </p>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-1 flex-col bg-background">
          <div className="flex flex-1 items-center justify-center overflow-y-auto px-10">
            <div className="w-full max-w-[400px]">{children}</div>
          </div>
        </div>
      </div>

      {/* ═══ Mobile layout: cosmic background + glass card ═══ */}
      <div
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-10 lg:hidden"
        style={{ backgroundColor: "#08080D" }}
      >
        {/* Ambient gradient overlays */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(196,112,74,0.07) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(122,155,118,0.04) 0%, transparent 60%)",
          }}
        />

        <ParticleCanvas particleCount={50} />

        {/* Compact logo above card */}
        <div className="relative z-10 mb-6">
          <AnimatedLogo compact />
        </div>

        {/* Glass card with form */}
        <div className="auth-glass-card relative z-10 w-full max-w-[400px] px-6 py-8">
          {children}
        </div>
      </div>
    </>
  );
}
