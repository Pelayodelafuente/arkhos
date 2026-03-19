"use client";

interface SuccessAnimationProps {
  email: string;
  onBack: () => void;
}

export function SuccessAnimation({ email, onBack }: SuccessAnimationProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Animated check circle */}
      <div className="auth-success-check mb-6">
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="#8AAC7E"
            strokeWidth="2.5"
            fill="none"
            className="auth-draw-circle"
          />
          <path
            d="M20 33 L28 41 L44 25"
            stroke="#8AAC7E"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="auth-draw-check"
          />
        </svg>
      </div>

      <h3
        className="font-display text-xl text-foreground"
        style={{ fontSize: 22 }}
      >
        Enlace enviado
      </h3>
      <p className="mt-2 text-sm" style={{ color: "#6B6F62" }}>
        Revisa tu bandeja de entrada en{" "}
        <span className="font-medium text-foreground">{email}</span>
      </p>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex h-[46px] w-full items-center justify-center rounded-[10px] border border-border text-sm font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent"
      >
        Volver al login
      </button>
    </div>
  );
}
