import { createClient } from "@/lib/supabase/server";
import { MfaSettings } from "./mfa-settings";

export default async function SecurityPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const enrolledFactor = data?.totp?.find((f) => f.status === "verified") ?? null;

  return (
    <div className="p-6 md:p-8">
      <h1 className="mb-6 font-heading text-2xl text-foreground">Seguridad</h1>
      <MfaSettings enrolledFactor={enrolledFactor} />
    </div>
  );
}
