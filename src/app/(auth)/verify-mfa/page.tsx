"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input } from "@/components/ui";
import { useToast } from "@/stores/ui-store";

export default function VerifyMfaPage() {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (!totpFactor) throw new Error("No se encontró factor TOTP");

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      router.push("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Código incorrecto");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg">
      <h2 className="mb-2 text-center font-heading text-2xl text-foreground">
        Verificación en dos pasos
      </h2>
      <p className="mb-6 text-center text-sm text-text-tertiary">
        Introduce el código de tu aplicación autenticadora
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Código de 6 dígitos"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          className="w-full"
        >
          Verificar
        </Button>
      </form>
    </Card>
  );
}
