"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

const initialState: AuthState = { error: null, success: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      {/* Title */}
      <h1
        className="font-heading text-foreground"
        style={{ fontSize: 26, lineHeight: 1.2 }}
      >
        Bienvenido
      </h1>
      <p className="mt-2 text-[14px]" style={{ color: "#888780" }}>
        Introduce tus credenciales para acceder a tu espacio de trabajo.
      </p>

      {/* Form */}
      <form action={formAction} className="mt-8 space-y-5">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-[12px] font-semibold"
            style={{ color: "#3D3630" }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="auth-input"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-[12px] font-semibold"
              style={{ color: "#3D3630" }}
            >
              Contraseña
            </label>
            <Link
              href="/reset-password"
              className="text-[11px] transition-colors hover:opacity-80"
              style={{ color: "#C4704A" }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="auth-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary transition-colors hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <EyeOff size={16} strokeWidth={1.5} />
              ) : (
                <Eye size={16} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {state.error && (
          <p className="text-[13px] text-red-600">{state.error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: pending ? "#B5623D" : "#C4704A" }}
          onMouseEnter={(e) => {
            if (!pending) e.currentTarget.style.backgroundColor = "#B5623D";
          }}
          onMouseLeave={(e) => {
            if (!pending) e.currentTarget.style.backgroundColor = "#C4704A";
          }}
        >
          {pending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Entrando...
            </>
          ) : (
            <>
              Iniciar sesión
              <ArrowRight size={16} strokeWidth={2} />
            </>
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="mt-4 text-center text-[13px]" style={{ color: "#888780" }}>
        No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-semibold transition-colors hover:opacity-80"
          style={{ color: "#C4704A" }}
        >
          Registrarse
        </Link>
      </p>
    </div>
  );
}
