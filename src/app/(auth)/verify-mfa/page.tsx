"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/stores/ui-store";
import { MfaCodeInput } from "@/components/auth/MfaCodeInput";
import { ArrowRight, LogOut } from "lucide-react";

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
      {/* Title */}
      <h1
        className="font-display text-foreground"
        style={{ fontSize: 26, lineHeight: 1.2 }}
      >
        Verificación de seguridad
      </h1>
      <p className="mt-2 text-[14px]" style={{ color: "#6B6F62" }}>
        Introduce el código de 6 dígitos de tu app de autenticación.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <MfaCodeInput value={code} onChange={setCode} />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: loading ? "#799E6D" : "#8AAC7E" }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "#799E6D";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = "#8AAC7E";
          }}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Verificando...
            </>
          ) : (
            <>
              Verificar
              <ArrowRight size={16} strokeWidth={2} />
            </>
          )}
        </button>
      </form>

      {/* Logout link */}
      <p className="mt-6 text-center">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-[12px] transition-colors hover:opacity-80"
          style={{ color: "#6B6F62" }}
        >
          <LogOut size={12} strokeWidth={1.5} />
          ¿No tienes acceso? Cerrar sesión
        </button>
      </p>
    </div>
  );
}
