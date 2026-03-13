"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "../actions";

const initialState: AuthState = { error: null, success: null };

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, initialState);

  return (
    <div className="rounded-lg border border-border bg-card p-8">
      <h2 className="mb-6 text-center font-heading text-2xl text-foreground">
        Crear cuenta
      </h2>

      {state.success ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-text-secondary">{state.success}</p>
          <Link
            href="/login"
            className="inline-block text-sm text-accent hover:underline"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="mb-1 block text-sm font-medium text-text-secondary"
              >
                Nombre completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-text-tertiary focus:border-accent"
                placeholder="Pelayo de la Fuente"
              />
            </div>

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
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-text-tertiary focus:border-accent"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-text-secondary"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-text-tertiary focus:border-accent"
                placeholder="Repite la contraseña"
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
              {pending ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-tertiary">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
