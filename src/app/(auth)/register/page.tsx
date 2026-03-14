"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const initialState: AuthState = { error: null, success: null };

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, initialState);

  return (
    <Card padding="lg">
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
            <Input
              label="Nombre completo"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              placeholder="Pelayo de la Fuente"
            />

            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@email.com"
            />

            <Input
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />

            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Repite la contraseña"
            />

            {state.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}

            <Button type="submit" variant="primary" size="md" loading={pending} className="w-full">
              Crear cuenta
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-tertiary">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </>
      )}
    </Card>
  );
}
