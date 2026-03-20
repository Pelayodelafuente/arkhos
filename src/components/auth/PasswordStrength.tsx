"use client";

interface PasswordStrengthProps {
  password: string;
  dark?: boolean;
}

function getStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const LABELS = ["", "Débil", "Media", "Fuerte", "Muy fuerte"];
const COLORS = ["", "#DC2626", "#E57A1A", "#5B8C6A", "#3D7A4A"];

export function PasswordStrength({ password, dark }: PasswordStrengthProps) {
  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{
              backgroundColor:
                segment <= strength
                  ? COLORS[strength]
                  : dark ? "rgba(255, 255, 255, 0.1)" : "rgba(226, 217, 202, 0.5)",
            }}
          />
        ))}
      </div>
      <p
        className="text-[11px] font-medium transition-colors duration-300"
        style={{ color: COLORS[strength] }}
      >
        {LABELS[strength]}
      </p>
    </div>
  );
}
