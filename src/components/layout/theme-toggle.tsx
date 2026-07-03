"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getTheme, toggleTheme, THEME_CHANGE_EVENT, type ArkhosTheme } from "@/lib/theme";

interface ThemeToggleProps {
  /** "icon" — botón cuadrado solo icono (Topbar). "menu" — fila con label (dock/perfil). */
  variant?: "icon" | "menu";
  className?: string;
}

// Botón de cambio de tema claro/oscuro. El estado real vive en <html data-theme>;
// hasta el mount se pinta el icono de luna para no romper la hidratación.
export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const [theme, setThemeState] = useState<ArkhosTheme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el DOM tras montar (patrón mounted)
    setThemeState(getTheme());
    const onChange = () => setThemeState(getTheme());
    window.addEventListener(THEME_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  }, []);

  const isDark = theme === "dark";
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  const Icon = isDark ? Sun : Moon;

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={() => setThemeState(toggleTheme())}
        className={className}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", padding: "7px 10px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 9, color: "rgba(255,255,255,0.5)",
          fontSize: 12, cursor: "pointer",
          transition: "background 0.15s, color 0.15s",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.08)"; b.style.color = "rgba(255,255,255,0.8)"; }}
        onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.04)"; b.style.color = "rgba(255,255,255,0.5)"; }}
      >
        <Icon size={16} strokeWidth={1.75} style={{ opacity: 0.7 }} />
        {isDark ? "Modo claro" : "Modo oscuro"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      className={
        className ??
        "flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-sand"
      }
      aria-label={label}
      title={label}
    >
      <Icon size={19} strokeWidth={1.75} />
    </button>
  );
}
