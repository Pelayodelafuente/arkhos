"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";

const initialState: AuthState = { error: null, success: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="rounded-lg border border-border bg-card p-8">
      <h2 className="mb-6 text-center font-heading text-2xl text-foreground">
        Iniciar sesión
      </h2>

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

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-text-secondary"
          >
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-text-tertiary focus:border-accent"
            placeholder="••••••••"
          />
        </div>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Entrando..." : "Iniciar sesión"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm">
        <p className="text-text-tertiary">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Crear cuenta
          </Link>
        </p>
        <p>
          <Link
            href="/reset-password"
            className="text-text-tertiary hover:text-accent"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
    </div>
  );
}
