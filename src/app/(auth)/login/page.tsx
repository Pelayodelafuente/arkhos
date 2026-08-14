"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { Mail, Lock, Eye, EyeOff, Clock } from "lucide-react";

const initialState: AuthState = { error: null, success: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);

  // Aviso de sesión cerrada por inactividad (?expired=1 desde el middleware)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("expired") === "1") {
      setExpiredNotice(true);
    }
  }, []);

  return (
    <div className="relative">
      {/* Aviso de sesión caducada por inactividad */}
      {expiredNotice && (
        <div
          className="mb-5 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px]"
          style={{
            background: "var(--warning-bg)",
            border: "1px solid var(--warning-border)",
            color: "var(--warning)",
          }}
        >
          <Clock size={15} strokeWidth={1.75} className="flex-shrink-0" />
          <span>Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.</span>
        </div>
      )}

      {/* Form */}
      <form action={formAction} className="space-y-5">
        <AuthInput
          id="email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          autoComplete="email"
          autoFocus
          required
        />

        <div>
          <div className="mb-1.5 flex justify-end">
            <Link
              href="/reset-password"
              className="text-[11px] transition-colors hover:opacity-80"
              style={{ color: "var(--auth-copper)" }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <AuthInput
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            label="Contraseña"
            icon={Lock}
            autoComplete="current-password"
            required
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="transition-colors"
                style={{ color: "var(--text-tertiary)" }}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff size={16} strokeWidth={1.5} />
                ) : (
                  <Eye size={16} strokeWidth={1.5} />
                )}
              </button>
            }
          />
        </div>

        {/* Error */}
        {state.error && <AuthError message={state.error} />}

        <AuthButton type="submit" loading={pending}>
          Iniciar sesión
        </AuthButton>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>
        ¿No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-semibold transition-colors hover:opacity-80"
          style={{ color: "var(--auth-copper)" }}
        >
          Registrarse
        </Link>
      </p>
    </div>
  );
}
