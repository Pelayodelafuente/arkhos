"use client";

import { useState, useActionState, useTransition } from "react";
import Link from "next/link";
import { register, type AuthState } from "../actions";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import {
  User,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Wallet,
  TrendingUp,
  StickyNote,
  LayoutGrid,
  Check,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const initialState: AuthState = { error: null, success: null };

const MODULE_OPTIONS = [
  { id: "gastos", label: "Gastos", icon: Wallet, color: "#3B78B0" },
  { id: "finanzas", label: "Finanzas", icon: TrendingUp, color: "#2E7D6B" },
  { id: "notas", label: "Notas", icon: StickyNote, color: "#B07A3A" },
  { id: "todo", label: "Todo", icon: LayoutGrid, color: "#7260C4" },
];

const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
};

export default function RegisterPage() {
  const [state, formAction] = useActionState(register, initialState);
  const [, startTransition] = useTransition();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [preferredModule, setPreferredModule] = useState("");
  const [clientError, setClientError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function nextStep() {
    setClientError("");
    if (step === 1) {
      if (!name.trim()) return setClientError("El nombre es obligatorio");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return setClientError("Email no válido");
    }
    if (step === 2) {
      if (password.length < 8)
        return setClientError("Mínimo 8 caracteres");
      if (password !== confirmPassword)
        return setClientError("Las contraseñas no coinciden");
    }
    setDirection(1);
    setStep((s) => s + 1);
  }

  function prevStep() {
    setClientError("");
    setDirection(-1);
    setStep((s) => s - 1);
  }

  function handleSubmit() {
    setClientError("");
    setSubmitting(true);
    if (preferredModule) {
      try {
        localStorage.setItem("arkhos_preferred_module", preferredModule);
      } catch {}
    }
    const fd = new FormData();
    fd.set("fullName", name);
    fd.set("email", email);
    fd.set("password", password);
    fd.set("confirmPassword", confirmPassword);
    startTransition(() => formAction(fd));
  }

  // Show success state
  if (state.success) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-6" style={{ animation: "auth-panel-enter 0.5s ease-out both" }}>
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
              stroke="var(--auth-copper)"
              strokeWidth="2.5"
              fill="none"
              className="auth-draw-circle"
            />
            <path
              d="M20 33 L28 41 L44 25"
              stroke="var(--auth-copper)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="auth-draw-check"
            />
          </svg>
        </div>
        <h3
          className="font-heading text-[22px]"
          style={{ color: "var(--text-primary)" }}
        >
          Cuenta creada
        </h3>
        <p className="mt-2 text-[14px]" style={{ color: "var(--text-tertiary)" }}>
          {state.success}
        </p>
        <Link href="/login" className="mt-6 w-full">
          <AuthButton variant="secondary">Ir a iniciar sesión</AuthButton>
        </Link>
      </div>
    );
  }

  // Show server error from formAction
  const error = clientError || state.error;

  return (
    <div className="relative">
      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-center gap-0">
        {[1, 2, 3].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className="flex h-2 w-2 items-center justify-center rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  step >= s ? "var(--auth-copper)" : "color-mix(in srgb, var(--bg-sand) 60%, transparent)",
                border:
                  step >= s ? "none" : "1px solid var(--auth-border)",
                boxShadow:
                  step === s
                    ? "0 0 8px rgba(212, 132, 90, 0.4)"
                    : "none",
              }}
            />
            {i < 2 && (
              <div
                className="mx-2 h-px w-8 transition-colors duration-300"
                style={{
                  backgroundColor:
                    step > s ? "var(--auth-copper)" : "var(--border-stone)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {step === 1 && (
          <motion.div
            key="step1"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="font-heading"
              style={{ fontSize: 24, color: "var(--text-primary)" }}
            >
              ¿Cómo te llamamos?
            </h1>
            <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-tertiary)" }}>
              Empecemos con lo básico
            </p>

            <div className="mt-6 space-y-4">
              <AuthInput
                id="fullName"
                name="fullName"
                type="text"
                label="Nombre completo"
                icon={User}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <AuthInput
                id="email"
                name="email"
                type="email"
                label="Email"
                icon={Mail}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}

            <div className="mt-6">
              <AuthButton type="button" onClick={nextStep}>
                Continuar
              </AuthButton>
            </div>

            <p className="mt-4 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="font-semibold transition-colors hover:opacity-80"
                style={{ color: "var(--auth-copper)" }}
              >
                Iniciar sesión
              </Link>
            </p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="font-heading"
              style={{ fontSize: 24, color: "var(--text-primary)" }}
            >
              Protege tu acceso
            </h1>
            <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-tertiary)" }}>
              Elige una contraseña segura
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <AuthInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  label="Contraseña"
                  icon={Lock}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff size={16} strokeWidth={1.5} />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} />
                      )}
                    </button>
                  }
                />
                <PasswordStrength password={password} />
              </div>
              <AuthInput
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                label="Confirmar contraseña"
                icon={Shield}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="transition-colors"
                    style={{ color: "var(--text-tertiary)" }}
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                }
              />
            </div>

            {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}

            <div className="mt-6 flex gap-3">
              <AuthButton variant="ghost" type="button" onClick={prevStep}>
                <ArrowLeft size={16} strokeWidth={1.5} />
                Atrás
              </AuthButton>
              <AuthButton type="button" onClick={nextStep}>
                Continuar
              </AuthButton>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="font-heading"
              style={{ fontSize: 24, color: "var(--text-primary)" }}
            >
              ¿Qué quieres controlar primero?
            </h1>
            <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-tertiary)" }}>
              Puedes cambiar esto después
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {MODULE_OPTIONS.map((mod) => {
                const selected = preferredModule === mod.id;
                const ModIcon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setPreferredModule(selected ? "" : mod.id)}
                    className="relative flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200"
                    style={{
                      border: `1px solid ${selected ? mod.color : "var(--border-stone)"}`,
                      backgroundColor: selected
                        ? `color-mix(in srgb, ${mod.color} 12%, transparent)`
                        : "color-mix(in srgb, var(--bg-sand) 45%, transparent)",
                      boxShadow: selected
                        ? `0 0 16px color-mix(in srgb, ${mod.color} 22%, transparent)`
                        : "none",
                    }}
                  >
                    {selected && (
                      <Check
                        size={12}
                        strokeWidth={2.5}
                        className="absolute right-2 top-2"
                        style={{ color: mod.color }}
                      />
                    )}
                    <ModIcon
                      size={22}
                      strokeWidth={1.5}
                      style={{ color: selected ? mod.color : "var(--auth-gray)" }}
                    />
                    <span
                      className="text-[12px] font-medium"
                      style={{ color: selected ? mod.color : "var(--auth-gray)" }}
                    >
                      {mod.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}

            <div className="mt-6 flex gap-3">
              <AuthButton variant="ghost" type="button" onClick={prevStep}>
                <ArrowLeft size={16} strokeWidth={1.5} />
                Atrás
              </AuthButton>
              <AuthButton type="button" onClick={handleSubmit} loading={submitting}>
                Crear mi cuenta
              </AuthButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
