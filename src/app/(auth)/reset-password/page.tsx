"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const initialState: AuthState = { error: null, success: null };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <Card>
      <h2 className="mb-2 text-center font-heading text-2xl text-foreground">
        Restablecer contraseña
      </h2>
      <p className="mb-6 text-center text-sm text-text-tertiary">
        Te enviaremos un enlace para crear una nueva contraseña.
      </p>

      <form action={formAction} className="space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
        />

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        {state.success && (
          <p className="text-sm text-green-700">{state.success}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={pending}
          className="w-full"
        >
          Enviar enlace
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-tertiary">
        <Link href="/login" className="text-accent hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </Card>
  );
}
