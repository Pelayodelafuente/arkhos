import { createClient } from "@/lib/supabase/server";
import { BottomDock } from "@/components/layout/BottomDock";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { QuickCapture } from "@/components/modules/notes/QuickCapture";
import { MfaBanner } from "@/components/layout/MfaBanner";

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
  let initialProjectCount = 0;
  let initialNoteCount = 0;
  let mfaActive = false;

  if (user) {
    const [{ data: profile }, { count: projectCount }, { count: noteCount }, { data: mfaData }] =
      await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active"),
        supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("archived", false)
          .is("deleted_at", null),
        supabase.auth.mfa.listFactors(),
      ]);

    if (profile?.full_name) userName = profile.full_name;
    avatarUrl = profile?.avatar_url ?? null;
    initialProjectCount = projectCount ?? 0;
    initialNoteCount = noteCount ?? 0;
    mfaActive = (mfaData?.totp ?? []).some((f) => f.status === "verified");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-transparent">
      <NavigationProgress />

      {/* Mobile topbar */}
      <Topbar userName={userName} />

      {/* MFA warning banner — shown when 2FA is not active */}
      {!mfaActive && <MfaBanner />}

      {/* Page content — full width on desktop */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-20 lg:px-8 lg:py-6 lg:pb-28">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Desktop bottom dock */}
      <BottomDock
        userName={userName}
        avatarUrl={avatarUrl}
        initialProjectCount={initialProjectCount}
        initialNoteCount={initialNoteCount}
      />

      <QuickCapture userId={userId} />
    </div>
  );
}
