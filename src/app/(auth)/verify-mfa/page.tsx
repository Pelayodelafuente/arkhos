"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/stores/ui-store";
import { MfaCodeInput } from "@/components/auth/MfaCodeInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { LogOut } from "lucide-react";

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Código incorrecto");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="relative">
      <h1
        className="font-heading"
        style={{ fontSize: 26, lineHeight: 1.2, color: "var(--auth-text)" }}
      >
        Verificación de seguridad
      </h1>
      <p className="mt-2 text-[14px]" style={{ color: "var(--auth-gray)" }}>
        Introduce el código de 6 dígitos de tu app de autenticación.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <MfaCodeInput value={code} onChange={setCode} />

        <AuthButton type="submit" disabled={code.length !== 6} loading={loading}>
          Verificar
        </AuthButton>
      </form>

      <p className="mt-6 text-center">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-[12px] transition-colors hover:opacity-80"
          style={{ color: "var(--auth-gray)" }}
        >
          <LogOut size={12} strokeWidth={1.5} />
          ¿No tienes acceso? Cerrar sesión
        </button>
      </p>
    </div>
  );
}
