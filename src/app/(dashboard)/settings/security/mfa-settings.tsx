"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input } from "@/components/ui";
import { useToast } from "@/stores/ui-store";
import type { Factor } from "@supabase/supabase-js";

interface MfaSettingsProps {
  enrolledFactor: Factor | null;
}

type Step = "idle" | "enrolling" | "verifying";

export function MfaSettings({ enrolledFactor }: MfaSettingsProps) {
  const toast = useToast();
  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasFactor, setHasFactor] = useState(!!enrolledFactor);

  async function handleEnroll() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setFactorId(data.id);
      setStep("verifying");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al iniciar MFA");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!factorId || code.length !== 6) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: challengeError, data: challengeData } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      setHasFactor(true);
      setStep("idle");
      setCode("");
      toast.success("Autenticación de dos factores activada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Código incorrecto");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnenroll() {
    if (!enrolledFactor) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId: enrolledFactor.id });
      if (error) throw error;
      setHasFactor(false);
      toast.success("Autenticación de dos factores desactivada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al desactivar MFA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg" className="max-w-md">
      <h2 className="mb-1 font-heading text-xl text-foreground">
        Autenticación de dos factores
      </h2>
      <p className="mb-6 text-sm text-text-tertiary">
        Añade una capa extra de seguridad con una aplicación TOTP (Google Authenticator, Authy…).
      </p>

      {hasFactor && step === "idle" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full bg-green-500 dot-pulse-active"
              style={{ "--dot-color": "rgba(34, 197, 94, 0.4)" } as React.CSSProperties}
            />
            <span className="text-sm font-medium text-foreground">Activo</span>
          </div>
          <Button variant="danger" size="sm" loading={loading} onClick={handleUnenroll}>
            Desactivar
          </Button>
        </div>
      )}

      {!hasFactor && step === "idle" && (
        <Button variant="primary" size="md" loading={loading} onClick={handleEnroll}>
          Activar autenticación de dos factores
        </Button>
      )}

      {step === "verifying" && qrCode && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Escanea este QR con tu aplicación autenticadora:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="QR code MFA" className="h-40 w-40 rounded-xl border border-border" />
          <Input
            label="Código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <Button variant="primary" size="md" loading={loading} onClick={handleVerify}>
            Verificar y activar
          </Button>
        </div>
      )}
    </Card>
  );
}
