"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Input, Button } from "@/components/ui";
import { useToast } from "@/stores/ui-store";
import { User, Lock } from "lucide-react";

interface ProfileFormProps {
  initialName: string;
  email: string;
}

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const toast = useToast();

  // Profile section
  const [displayName, setDisplayName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  // Password section
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });
      if (error) throw error;
      // Also update profiles table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ full_name: trimmed })
          .eq("id", user.id);
      }
      toast.success("Nombre actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar el nombre");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Contraseña actualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar la contraseña");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile section */}
      <Card padding="lg" className="max-w-md">
        <div className="mb-5 flex items-center gap-2">
          <User size={16} strokeWidth={1.75} className="text-text-secondary" aria-hidden="true" />
          <h2 className="font-heading text-xl text-foreground">Perfil</h2>
        </div>

        <div className="mb-4">
          <p className="text-sm text-text-tertiary">Correo electrónico</p>
          <p className="mt-1 text-sm font-medium text-foreground">{email}</p>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4">
          <Input
            label="Nombre visible"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            autoComplete="name"
            maxLength={80}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={savingName}
            disabled={!displayName.trim() || displayName.trim() === initialName}
          >
            Guardar nombre
          </Button>
        </form>
      </Card>

      {/* Password section */}
      <Card padding="lg" className="max-w-md">
        <div className="mb-5 flex items-center gap-2">
          <Lock size={16} strokeWidth={1.75} className="text-text-secondary" aria-hidden="true" />
          <h2 className="font-heading text-xl text-foreground">Contraseña</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordError("");
            }}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            error={passwordError && !confirmPassword ? passwordError : undefined}
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordError("");
            }}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            error={passwordError && confirmPassword ? passwordError : undefined}
          />
          {passwordError && !newPassword && !confirmPassword && (
            <p className="text-xs" style={{ color: "var(--error)" }}>{passwordError}</p>
          )}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={savingPassword}
            disabled={!newPassword || !confirmPassword}
          >
            Cambiar contraseña
          </Button>
        </form>
      </Card>
    </div>
  );
}
