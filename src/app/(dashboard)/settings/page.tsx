import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Shield } from "lucide-react";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Resolve display name: prefer profiles table, fall back to auth metadata, then email
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    "";

  const email = user.email ?? "";

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in-up mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sand">
          <Settings size={20} strokeWidth={1.75} className="text-text-secondary" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-2xl text-foreground">Configuración</h1>
      </div>

      {/* Profile + password forms */}
      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <ProfileForm initialName={displayName} email={email} />
      </div>

      {/* Security link */}
      <div className="animate-fade-in-up mt-6 max-w-md" style={{ animationDelay: "160ms" }}>
        <Link
          href="/settings/security"
          className="flex items-center justify-between rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-[2px]"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--card)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand">
              <Shield size={16} strokeWidth={1.75} className="text-text-secondary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Seguridad</p>
              <p className="text-xs text-text-tertiary">
                Autenticacion en dos pasos (2FA)
              </p>
            </div>
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
            Gestionar →
          </span>
        </Link>
      </div>
    </div>
  );
}
