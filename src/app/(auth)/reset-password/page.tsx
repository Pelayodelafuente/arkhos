"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword, type AuthState } from "../actions";
import { SuccessAnimation } from "@/components/auth/SuccessAnimation";
import { ArrowLeft, ArrowRight } from "lucide-react";

const initialState: AuthState = { error: null, success: null };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [email, setEmail] = useState("");
  const router = useRouter();

  if (state.success) {
    return (
      <SuccessAnimation
        email={email}
        onBack={() => router.push("/login")}
      />
    );
  }

  return (
    <div className="relative">
      {/* Back link — desktop */}
      <div className="mb-10 hidden lg:block">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] transition-colors hover:opacity-80"
          style={{ color: "#888780" }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Volver al login
        </Link>
      </div>

      {/* Title */}
      <h1
        className="font-heading text-foreground"
        style={{ fontSize: 26, lineHeight: 1.2 }}
      >
        Recuperar contraseña
      </h1>
      <p className="mt-2 text-[14px]" style={{ color: "#888780" }}>
        Te enviaremos un enlace para restablecer tu contraseña.
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
              Enviando...
            </>
          ) : (
            <>
              Enviar enlace
              <ArrowRight size={16} strokeWidth={2} />
            </>
          )}
        </button>
      </form>

      {/* Mobile back link */}
      <p className="mt-6 text-center lg:hidden">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] transition-colors hover:opacity-80"
          style={{ color: "#888780" }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Volver al login
        </Link>
      </p>
    </div>
  );
}
