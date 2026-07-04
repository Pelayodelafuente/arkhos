import { createClient } from "@/lib/supabase/server";
import { BottomDock } from "@/components/layout/BottomDock";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { QuickCapture } from "@/components/modules/notes/QuickCapture";
import { MfaBanner } from "@/components/layout/MfaBanner";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { AppDataLoader } from "@/components/layout/AppDataLoader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "";
  let userName = user?.email || "usuario";
  let avatarUrl: string | null = null;
  let mfaActive = false;

  if (user) {
    const [{ data: profile }, { data: mfaData }] =
      await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
        supabase.auth.mfa.listFactors(),
      ]);

    if (profile?.full_name) userName = profile.full_name;
    avatarUrl = profile?.avatar_url ?? null;
    mfaActive = (mfaData?.totp ?? []).some((f) => f.status === "verified");
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-transparent">
      <NavigationProgress />

      {/* Mobile topbar */}
      <Topbar userName={userName} />

      {/* MFA warning banner — shown when 2FA is not active */}
      {!mfaActive && <MfaBanner />}

      {/* Page content — full width on desktop */}
      <main className="relative flex-1 overflow-y-auto px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-6 lg:pb-28">
        <AppDataLoader>{children}</AppDataLoader>
      </main>

      {/* Mobile bottom nav — dock móvil, misma identidad que el BottomDock */}
      <BottomNav
        userName={userName}
        avatarUrl={avatarUrl}
      />

      {/* Desktop bottom dock */}
      <BottomDock
        userName={userName}
        avatarUrl={avatarUrl}
      />

      <QuickCapture userId={userId} />

      {/* Command palette global — ⌘K / Ctrl+K */}
      <CommandPalette userId={userId} />
    </div>
  );
}
