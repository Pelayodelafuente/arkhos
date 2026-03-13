import { createClient } from "@/lib/supabase/server";
import { ArkhosLogo } from "@/components/ui/arkhos-logo";
import { LogoutButton } from "./logout-button";

const modules = [
  {
    name: "Proyectos",
    color: "var(--module-proyectos)",
    href: "/proyectos",
  },
  {
    name: "Mercados",
    color: "var(--module-mercados)",
    href: "/mercados",
  },
  {
    name: "Patrimonio",
    color: "var(--module-patrimonio)",
    href: "/patrimonio",
  },
  {
    name: "Gastos",
    color: "var(--module-gastos)",
    href: "/gastos",
  },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = user?.email || "usuario";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile?.full_name) {
      displayName = profile.full_name;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <ArkhosLogo size="md" />
          <p className="text-text-tertiary">
            Bienvenido, <span className="text-foreground">{displayName}</span>
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modules.map((mod) => (
          <a
            key={mod.name}
            href={mod.href}
            className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent"
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-white"
              style={{ backgroundColor: mod.color }}
            >
              {mod.name[0]}
            </div>
            <h2 className="font-medium text-foreground">{mod.name}</h2>
            <p className="mt-1 text-sm text-text-tertiary">
              Módulo en desarrollo
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
