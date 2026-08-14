"use client";

import { useState, useEffect, useActionState } from "react";
import Link from "next/link";
import { resetPassword, type AuthState } from "../actions";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { Mail, ArrowLeft } from "lucide-react";

const initialState: AuthState = { error: null, success: null };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!state.success) return;
    setCountdown(30); // eslint-disable-line react-hooks/set-state-in-effect -- countdown reset on success
    setCanResend(false);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.success]);

  function handleResend() {
    setCanResend(false);
    const fd = new FormData();
    fd.set("email", email);
    formAction(fd);
  }

  if (state.success) {
    return (
      <div className="flex flex-col items-center text-center">
        {/* Animated check */}
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
          Revisa tu bandeja
        </h3>
        <p className="mt-2 text-[14px]" style={{ color: "var(--text-tertiary)" }}>
          Enviamos un enlace a{" "}
          <span style={{ color: "var(--auth-copper)" }}>{email}</span>
        </p>

        {/* Countdown / resend */}
        <div className="mt-4">
          {!canResend ? (
            <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              ¿No lo recibiste? Reenviar en 00:{String(countdown).padStart(2, "0")}
            </p>
          ) : (
            <AuthButton variant="ghost" type="button" onClick={handleResend}>
              Reenviar enlace
            </AuthButton>
          )}
        </div>

        <div className="mt-6 w-full">
          <Link href="/login">
            <AuthButton variant="secondary">Volver al login</AuthButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <h1
        className="font-heading"
        style={{ fontSize: 26, lineHeight: 1.2, color: "var(--text-primary)" }}
      >
        ¿Perdiste el acceso?
      </h1>
      <p className="mt-2 text-[14px]" style={{ color: "var(--text-tertiary)" }}>
        Te enviaremos un enlace mágico
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        <AuthInput
          id="email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {state.error && <AuthError message={state.error} />}

        <AuthButton type="submit" loading={pending}>
          Enviar enlace
        </AuthButton>
      </form>

      <p className="mt-4 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] transition-colors hover:opacity-80"
          style={{ color: "var(--text-tertiary)" }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Volver al login
        </Link>
      </p>
    </div>
  );
}
