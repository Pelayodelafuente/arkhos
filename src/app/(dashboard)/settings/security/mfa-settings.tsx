"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Modal } from "@/components/ui";
import { MfaCodeInput } from "@/components/auth/MfaCodeInput";
import { useToast } from "@/stores/ui-store";
import { ShieldCheck, ShieldOff, ShieldAlert, Copy, Check } from "lucide-react";
import type { Factor } from "@supabase/supabase-js";

interface MfaSettingsProps {
  enrolledFactor: Factor | null;
}

interface EnrollData {
  factorId: string;
  qrCode: string;
  secret: string;
}

type ModalState = "closed" | "enroll" | "confirm-unenroll";

export function MfaSettings({ enrolledFactor }: MfaSettingsProps) {
  const toast = useToast();

  // Track activation state locally so UI updates without re-fetching server
  const [isActive, setIsActive] = useState(!!enrolledFactor);
  // factorId for unenroll: use server-fetched factor or one acquired during this session
  const [activeFactor, setActiveFactor] = useState<Factor | null>(enrolledFactor);

  const [modalState, setModalState] = useState<ModalState>("closed");
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // ─── Enroll ──────────────────────────────────────────────────────────────

  const handleOpenEnroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (enrollError) throw enrollError;
      setEnrollData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
      setModalState("enroll");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al iniciar la configuración de 2FA");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleVerify = useCallback(async () => {
    if (!enrollData || code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollData.factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      // Build a minimal Factor-like object so unenroll works without page reload
      const newFactor: Factor = {
        id: enrollData.factorId,
        status: "verified",
        factor_type: "totp",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setActiveFactor(newFactor);
      setIsActive(true);
      setModalState("closed");
      setEnrollData(null);
      setCode("");
      toast.success("Autenticación de dos factores activada correctamente");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código incorrecto. Inténtalo de nuevo.");
      setCode("");
    } finally {
      setLoading(false);
    }
  }, [enrollData, code, toast]);

  const handleCloseEnroll = useCallback(async () => {
    // If enrollment was started but not verified, cancel it to keep state clean
    if (enrollData) {
      try {
        const supabase = createClient();
        await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId });
      } catch {
        // Non-critical: ignore cleanup errors
      }
      setEnrollData(null);
    }
    setCode("");
    setError(null);
    setModalState("closed");
  }, [enrollData]);

  // ─── Unenroll ────────────────────────────────────────────────────────────

  const handleUnenroll = useCallback(async () => {
    if (!activeFactor) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: activeFactor.id,
      });
      if (unenrollError) throw unenrollError;
      setActiveFactor(null);
      setIsActive(false);
      setModalState("closed");
      toast.success("Autenticación de dos factores desactivada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al desactivar 2FA");
    } finally {
      setLoading(false);
    }
  }, [activeFactor, toast]);

  // ─── Copy secret ─────────────────────────────────────────────────────────

  const handleCopySecret = useCallback(async () => {
    if (!enrollData) return;
    try {
      await navigator.clipboard.writeText(enrollData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      toast.info("No se pudo copiar automáticamente");
    }
  }, [enrollData, toast]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Card padding="lg" className="max-w-md">
        <h2 className="mb-1 font-heading text-xl text-foreground">
          Autenticación de dos factores
        </h2>
        <p className="mb-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Añade una capa extra de seguridad con una aplicación TOTP (Google
          Authenticator, Authy, 1Password…).
        </p>

        {isActive ? (
          <div className="space-y-4">
            {/* Active state indicator */}
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: "var(--success-bg, rgba(46,125,107,0.08))",
                border: "1px solid var(--success-border, rgba(46,125,107,0.20))",
              }}
            >
              <ShieldCheck
                size={18}
                strokeWidth={1.75}
                aria-hidden="true"
                style={{ color: "var(--success, var(--color-gain))", flexShrink: 0 }}
              />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  2FA activo
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Tu cuenta está protegida con verificación TOTP.
                </p>
              </div>
            </div>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setModalState("confirm-unenroll")}
            >
              <ShieldOff size={14} strokeWidth={1.75} aria-hidden="true" />
              Desactivar 2FA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Inactive state indicator */}
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: "rgba(196,112,74,0.06)",
                border: "1px solid rgba(196,112,74,0.18)",
              }}
            >
              <ShieldAlert
                size={18}
                strokeWidth={1.75}
                aria-hidden="true"
                style={{ color: "var(--accent)", flexShrink: 0 }}
              />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Tu cuenta no tiene 2FA activado.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              loading={loading}
              onClick={handleOpenEnroll}
            >
              <ShieldCheck size={15} strokeWidth={1.75} aria-hidden="true" />
              Activar autenticación de dos factores
            </Button>
          </div>
        )}
      </Card>

      {/* ─── Enrollment modal ─────────────────────────────────────────── */}
      <Modal
        open={modalState === "enroll"}
        onClose={handleCloseEnroll}
        title="Configurar autenticación de dos factores"
      >
        {enrollData && (
          <div className="space-y-6">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Escanea el código QR con tu aplicación autenticadora. Si no puedes
              escanearlo, introduce el código manualmente.
            </p>

            {/* QR code */}
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollData.qrCode}
                alt="Código QR para configurar 2FA — escanea con tu app autenticadora"
                className="rounded-xl"
                style={{
                  width: 160,
                  height: 160,
                  border: "1px solid var(--border)",
                }}
              />
            </div>

            {/* Manual secret */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                Código manual (entrada alternativa)
              </p>
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: "var(--bg-secondary, var(--bg-page))",
                  border: "1px solid var(--border)",
                }}
              >
                <code
                  className="flex-1 font-mono text-xs tracking-wider"
                  style={{ color: "var(--text-primary)" }}
                >
                  {enrollData.secret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  aria-label="Copiar código secreto"
                  className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-sand"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {secretCopied ? (
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Code verification */}
            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Introduce el código de 6 dígitos generado por la app:
              </p>
              <MfaCodeInput value={code} onChange={(v) => { setCode(v); setError(null); }} />
              {error && (
                <p className="text-center text-xs" style={{ color: "var(--error)" }}>
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={handleCloseEnroll}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                loading={loading}
                disabled={code.length !== 6}
                onClick={handleVerify}
              >
                Verificar y activar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Confirm unenroll modal ───────────────────────────────────── */}
      <Modal
        open={modalState === "confirm-unenroll"}
        onClose={() => setModalState("closed")}
        title="Desactivar autenticación de dos factores"
      >
        <div className="space-y-6">
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--error-text)" }}>
              Al desactivar 2FA, tu cuenta quedará protegida únicamente por
              contraseña. Esta acción es inmediata.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => setModalState("closed")}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              loading={loading}
              onClick={handleUnenroll}
            >
              Sí, desactivar 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
