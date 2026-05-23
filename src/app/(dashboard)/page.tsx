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

/** Devuelve una cadena de tiempo relativo legible en español */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} ${mins === 1 ? "min" : "min"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
}

/** Etiqueta legible para un módulo */
function moduleLabel(module: string): string {
  const map: Record<string, string> = {
    proyectos: "Proyecto",
    notas: "Nota",
    gastos: "Gasto",
    mercados: "Mercados",
    patrimonio: "Patrimonio",
  };
  return map[module] ?? module;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  let projectCount = 0;
  let noteCount = 0;
  let monthlyExpenses = 0;
  let recentActivity: Array<{
    id: string;
    module: string;
    action: string;
    entity_name: string | null;
    created_at: string;
  }> = [];

  if (user) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const [
      { data: profile },
      { count: pc },
      { count: nc },
      { data: payments },
      { data: activity },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      // Bug 2 fix: solo proyectos con status "active"
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
      // Bug 3 fix: gasto real del mes en curso desde subscription_payments
      supabase
        .from("subscription_payments")
        .select("amount")
        .eq("user_id", user.id)
        .gte("paid_at", monthStart),
      // Bug 4 fix: actividad real desde activity_log
      supabase
        .from("activity_log")
        .select("id, module, action, entity_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    displayName = profile?.full_name || user.email || "";
    projectCount = pc ?? 0;
    noteCount = nc ?? 0;

    monthlyExpenses =
      (payments ?? []).reduce(
        (sum, p) => sum + (typeof p.amount === "number" ? p.amount : 0),
        0
      );

    recentActivity = (activity ?? []) as typeof recentActivity;
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
      // Bug 5 fix: color correcto de Mercados en el design system
      name: "Mercados",
      href: "/mercados",
      icon: TrendingUp,
      color: "#9B7A4A",
      // Bug 3 fix: texto honesto, sin datos falsos
      preview: "Ver mercados",
    },
    {
      name: "Patrimonio",
      href: "/patrimonio",
      icon: Wallet,
      color: "#2E7D6B",
      // Bug 3 fix: texto honesto, sin datos falsos
      preview: "Ver patrimonio",
    },
    {
      name: "Gastos",
      href: "/gastos",
      icon: CreditCard,
      color: "#3B78B0",
      // Bug 3 fix: gasto real del mes o fallback honesto
      preview:
        monthlyExpenses > 0
          ? `€${monthlyExpenses.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} este mes`
          : "Ver gastos",
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

      {/* Bug 4 fix: feed de actividad real */}
      {recentActivity.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: "550ms" }}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
            Actividad reciente
          </h2>
          <Card padding="md">
            <ul className="divide-y divide-border">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{moduleLabel(entry.module)}</span>
                    {entry.entity_name ? (
                      <> &lsquo;{entry.entity_name}&rsquo;</>
                    ) : null}
                    {" "}
                    <span className="text-text-tertiary">{entry.action}</span>
                  </p>
                  <span className="shrink-0 font-mono text-xs text-text-tertiary">
                    {timeAgo(entry.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
