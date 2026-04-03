import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { QuickCapture } from "@/components/modules/notes/QuickCapture";

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
  let initialProjectCount = 0;
  let initialNoteCount = 0;

  if (user) {
    const [{ data: profile }, { count: projectCount }, { count: noteCount }] =
      await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

    if (profile?.full_name) userName = profile.full_name;
    initialProjectCount = projectCount ?? 0;
    initialNoteCount = noteCount ?? 0;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <NavigationProgress />
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar
          userName={userName}
          initialProjectCount={initialProjectCount}
          initialNoteCount={initialNoteCount}
        />
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <Topbar userName={userName} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-20 lg:px-6 lg:py-6 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
      <QuickCapture userId={userId} />
    </div>
  );
}
