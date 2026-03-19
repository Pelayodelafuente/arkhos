"use client";

interface PasswordStrengthProps {
  password: string;
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
const COLORS = ["", "#DC2626", "#C9A96E", "#8AAC7E", "#4D6845"];

export function PasswordStrength({ password }: PasswordStrengthProps) {
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
                  : "rgba(30, 34, 25, 0.5)",
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
