"use client";

import { useState, useActionState, useMemo } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { Mail, Lock, Eye, EyeOff, Sun, CloudSun, Moon, Github } from "lucide-react";
import { motion } from "framer-motion";

const initialState: AuthState = { error: null, success: null };

function getGreeting(): { text: string; Icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 13) return { text: "Buenos días", Icon: Sun };
  if (hour >= 13 && hour < 20) return { text: "Buenas tardes", Icon: CloudSun };
  return { text: "Buenas noches", Icon: Moon };
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const greeting = useMemo(getGreeting, []);
  const GreetingIcon = greeting.Icon;

  return (
    <div className="relative">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
        >
          <GreetingIcon
            size={28}
            strokeWidth={1.5}
            style={{ color: "var(--auth-copper)" }}
          />
        </motion.div>
        <h1
          className="font-heading"
          style={{ fontSize: 26, lineHeight: 1.2, color: "var(--auth-text)" }}
        >
          {greeting.text}
        </h1>
      </div>
      <p className="mt-2 text-[14px]" style={{ color: "var(--auth-gray)" }}>
        Accede a tu espacio personal
      </p>

      {/* Decorative separator */}
      <div
        className="mx-auto mt-5 mb-6 h-[1px] w-10"
        style={{ background: "linear-gradient(90deg, transparent, var(--auth-copper), transparent)" }}
      />

      {/* Form */}
      <form action={formAction} className="space-y-5">
        <AuthInput
          id="email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          autoComplete="email"
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
                style={{ color: "var(--auth-gray)" }}
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
        {state.error && (
          <p className="text-[13px] text-red-400">{state.error}</p>
        )}

        <AuthButton type="submit" loading={pending}>
          Iniciar sesión
        </AuthButton>
      </form>

      {/* Social separator */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1" style={{ backgroundColor: "var(--auth-border)" }} />
        <span className="text-[11px]" style={{ color: "var(--auth-gray)" }}>
          o continúa con
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--auth-border)" }} />
      </div>

      {/* OAuth buttons */}
      <div className="flex gap-3">
        <AuthButton variant="ghost" disabled className="opacity-50" title="Próximamente">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </AuthButton>
        <AuthButton variant="ghost" disabled className="opacity-50" title="Próximamente">
          <Github size={16} strokeWidth={1.5} />
          GitHub
        </AuthButton>
      </div>

      {/* Register link */}
      <p className="mt-6 text-center text-[13px]" style={{ color: "var(--auth-gray)" }}>
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
