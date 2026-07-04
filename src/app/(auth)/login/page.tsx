"use client";

import { useState, useActionState, useMemo } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { Mail, Lock, Eye, EyeOff, Sun, CloudSun, Moon } from "lucide-react";
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
  const greeting = useMemo(() => getGreeting(), []);
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
          style={{ fontSize: 26, lineHeight: 1.2, color: "var(--text-primary)" }}
        >
          {greeting.text}
        </h1>
      </div>
      <p className="mt-2 text-[14px]" style={{ color: "var(--text-secondary)" }}>
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
        {state.error && (
          <p className="text-[13px] text-red-400">{state.error}</p>
        )}

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
