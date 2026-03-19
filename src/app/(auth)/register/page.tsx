"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "../actions";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

const initialState: AuthState = { error: null, success: null };

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, initialState);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (state.success) {
    return (
      <div className="flex flex-col items-center text-center">
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
        <h3 className="font-display text-[22px] text-foreground">
          Cuenta creada
        </h3>
        <p className="mt-2 text-[14px]" style={{ color: "#6B6F62" }}>
          {state.success}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-[46px] w-full items-center justify-center rounded-[10px] border text-[14px] font-semibold transition-colors hover:border-accent hover:text-accent"
          style={{ borderColor: "#1E2219", color: "#BDB89F" }}
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Title */}
      <h1
        className="font-display text-foreground"
        style={{ fontSize: 26, lineHeight: 1.2 }}
      >
        Crear cuenta
      </h1>
      <p className="mt-2 text-[14px]" style={{ color: "#6B6F62" }}>
        Empieza a gestionar tus proyectos, mercados y patrimonio.
      </p>

      {/* Form */}
      <form action={formAction} className="mt-8 space-y-5">
        {/* Full name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fullName"
            className="text-[12px] font-semibold"
            style={{ color: "#BDB89F" }}
          >
            Nombre completo
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            placeholder="Pelayo de la Fuente"
            className="auth-input"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-[12px] font-semibold"
            style={{ color: "#BDB89F" }}
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
          <label
            htmlFor="password"
            className="text-[12px] font-semibold"
            style={{ color: "#BDB89F" }}
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="auth-input pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <PasswordStrength password={password} />
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-[12px] font-semibold"
            style={{ color: "#BDB89F" }}
          >
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Repite la contraseña"
              className="auth-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary transition-colors hover:text-foreground"
              tabIndex={-1}
              aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showConfirm ? (
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
          style={{ backgroundColor: pending ? "#799E6D" : "#8AAC7E" }}
          onMouseEnter={(e) => {
            if (!pending) e.currentTarget.style.backgroundColor = "#799E6D";
          }}
          onMouseLeave={(e) => {
            if (!pending) e.currentTarget.style.backgroundColor = "#8AAC7E";
          }}
        >
          {pending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Creando cuenta...
            </>
          ) : (
            <>
              Crear cuenta
              <ArrowRight size={16} strokeWidth={2} />
            </>
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="mt-4 text-center text-[13px]" style={{ color: "#6B6F62" }}>
        Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold transition-colors hover:opacity-80"
          style={{ color: "#8AAC7E" }}
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
