import { createClient } from "@/lib/supabase/server";
import { FolderKanban, TrendingUp, Wallet, CreditCard } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

const moduleCards = [
  {
    name: "Proyectos",
    href: "/proyectos",
    icon: FolderKanban,
    color: "#C4704A",
    preview: "0 proyectos activos",
  },
  {
    name: "Mercados",
    href: "/mercados",
    icon: TrendingUp,
    color: "#9B7A4A",
    preview: "BTC $—",
  },
  {
    name: "Patrimonio",
    href: "/patrimonio",
    icon: Wallet,
    color: "#5B8C6A",
    preview: "€— total",
  },
  {
    name: "Gastos",
    href: "/gastos",
    icon: CreditCard,
    color: "#4A7A9B",
    preview: "€— este mes",
  },
] as const;

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

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    displayName = profile?.full_name || user.email || "";
  }

  const greeting = getGreeting();
  const firstName = displayName.split(" ")[0] || displayName;

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl text-foreground">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Aquí tienes el resumen de tu centro de mando.
        </p>
      </div>

      {/* Module cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {moduleCards.map(({ name, href, icon: Icon, color, preview }) => (
          <Card key={name} clickable padding="sm">
            <Link href={href} className="block p-2">
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
        ))}
      </div>

      {/* Recent activity */}
      <div>
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
