import { createClient } from "@/lib/supabase/server";
import { FolderKanban, TrendingUp, Wallet, CreditCard, StickyNote } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 13) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  let projectCount = 0;
  let noteCount = 0;

  if (user) {
    const [
      { data: profile },
      { count: pc },
      { count: nc },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "archived"),
      supabase
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("archived", false)
        .is("deleted_at", null),
    ]);

    displayName = profile?.full_name || user.email || "";
    projectCount = pc ?? 0;
    noteCount = nc ?? 0;
  }

  const moduleCards = [
    {
      name: "Proyectos",
      href: "/proyectos",
      icon: FolderKanban,
      color: "#C4704A",
      preview: `${projectCount} ${projectCount === 1 ? "proyecto activo" : "proyectos activos"}`,
    },
    {
      name: "Notas",
      href: "/notas",
      icon: StickyNote,
      color: "#B07A3A",
      preview: `${noteCount} ${noteCount === 1 ? "nota" : "notas"}`,
    },
    {
      name: "Mercados",
      href: "/mercados",
      icon: TrendingUp,
      color: "#7260C4",
      preview: "BTC $—",
    },
    {
      name: "Patrimonio",
      href: "/patrimonio",
      icon: Wallet,
      color: "#2E7D6B",
      preview: "€— total",
    },
    {
      name: "Gastos",
      href: "/gastos",
      icon: CreditCard,
      color: "#3B78B0",
      preview: "€— este mes",
    },
  ];

  const greeting = getGreeting();
  const firstName = displayName.split(" ")[0] || displayName;

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="animate-fade-in-up font-heading text-3xl text-foreground">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p
          className="animate-fade-in-up mt-1 text-sm text-text-tertiary"
          style={{ animationDelay: "100ms" }}
        >
          Aquí tienes el resumen de tu centro de mando.
        </p>
      </div>

      {/* Module cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {moduleCards.map(({ name, href, icon: Icon, color, preview }, index) => (
          <div
            key={name}
            className="animate-fade-in-up"
            style={{ animationDelay: `${150 + index * 100}ms` }}
          >
            <Card clickable padding="sm">
              <Link href={href} className="block p-2 transition-transform duration-200 hover:-translate-y-[2px]">
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex items-center gap-2">
                    <Icon size={15} strokeWidth={1.75} className="text-text-tertiary" />
                    <span className="text-sm font-medium text-text-secondary">{name}</span>
                  </div>
                </div>
                <p className="font-mono text-xl text-foreground">{preview}</p>
              </Link>
            </Card>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="animate-fade-in-up" style={{ animationDelay: "550ms" }}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Actividad reciente
        </h2>
        <Card padding="md" className="text-center">
          <p className="text-sm text-text-tertiary">Sin actividad reciente</p>
        </Card>
      </div>
    </div>
  );
}
