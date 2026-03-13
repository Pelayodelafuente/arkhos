"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type AuthState } from "../actions";

const initialState: AuthState = { error: null, success: null };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState
  );

  return (
    <div className="rounded-lg border border-border bg-card p-8">
      <h2 className="mb-2 text-center font-heading text-2xl text-foreground">
        Restablecer contraseña
      </h2>
      <p className="mb-6 text-center text-sm text-text-tertiary">
        Te enviaremos un enlace para crear una nueva contraseña.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-text-tertiary focus:border-accent"
            placeholder="tu@email.com"
          />
        </div>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        {state.success && (
          <p className="text-sm text-green-700">{state.success}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-tertiary">
        <Link href="/login" className="text-accent hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
