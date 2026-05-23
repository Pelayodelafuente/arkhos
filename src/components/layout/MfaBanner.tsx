"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";

export function MfaBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
      style={{
        background: "rgba(196,112,74,0.08)",
        borderBottom: "1px solid rgba(196,112,74,0.20)",
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <ShieldAlert
          size={16}
          strokeWidth={1.75}
          className="flex-shrink-0"
          style={{ color: "var(--accent)" }}
          aria-hidden="true"
        />
        <p className="text-text-secondary">
          Para proteger tus datos financieros, activa la verificación en dos pasos.{" "}
          <Link
            href="/settings/security"
            className="font-semibold underline underline-offset-2 transition-colors hover:text-foreground"
            style={{ color: "var(--accent)" }}
          >
            Activar 2FA
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Cerrar aviso de seguridad"
        className="flex-shrink-0 rounded-md p-1 transition-colors hover:bg-sand"
        style={{ color: "var(--text-tertiary)" }}
      >
        <X size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
