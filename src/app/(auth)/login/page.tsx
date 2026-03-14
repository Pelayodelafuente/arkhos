"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const initialState: AuthState = { error: null, success: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <Card padding="lg">
      <h2 className="mb-6 text-center font-heading text-2xl text-foreground">
        Iniciar sesión
      </h2>

      <form action={formAction} className="space-y-4">
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
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <Button type="submit" variant="primary" size="md" loading={pending} className="w-full">
          Iniciar sesión
        </Button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm">
        <p className="text-text-tertiary">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Crear cuenta
          </Link>
        </p>
        <p>
          <Link href="/reset-password" className="text-text-tertiary hover:text-accent">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
    </Card>
  );
}
