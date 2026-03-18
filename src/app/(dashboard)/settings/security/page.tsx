import { createClient } from "@/lib/supabase/server";
import { Shield } from "lucide-react";
import { MfaSettings } from "./mfa-settings";

export default async function SecurityPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const enrolledFactor = data?.totp?.find((f) => f.status === "verified") ?? null;

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in-up mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sand">
          <Shield size={20} strokeWidth={1.75} className="text-text-secondary" />
        </div>
        <h1 className="font-heading text-2xl text-foreground">Seguridad</h1>
      </div>

      {/* MFA section */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <MfaSettings enrolledFactor={enrolledFactor} />
      </div>
    </div>
  );
}
