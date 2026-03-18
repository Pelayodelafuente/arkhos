import { ParticleCanvas } from "@/components/auth/ParticleCanvas";
import { AnimatedLogo } from "@/components/auth/AnimatedLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left panel — visual / experiential */}
      <div
        className="relative flex h-[200px] flex-shrink-0 items-center justify-center overflow-hidden lg:h-auto lg:flex-[7]"
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

        {/* Particle canvas */}
        <ParticleCanvas className="hidden lg:block" particleCount={80} />
        <ParticleCanvas className="block lg:hidden" particleCount={40} />

        {/* Centered animated logo */}
        <div className="relative z-10">
          {/* Desktop logo */}
          <div className="hidden lg:block">
            <AnimatedLogo />
          </div>
          {/* Mobile compact logo */}
          <div className="block lg:hidden">
            <AnimatedLogo compact />
          </div>
        </div>

        {/* Footer credit */}
        <p
          className="absolute bottom-7 left-0 right-0 hidden text-center text-[11px] lg:block"
          style={{ color: "rgba(250, 247, 242, 0.15)" }}
        >
          Built by Pelayo de la Fuente
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex min-h-0 flex-1 flex-col bg-background lg:flex-[3]">
        <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-8 sm:items-center sm:px-10 lg:px-10">
          <div className="w-full max-w-[360px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
