import { Wallet, PiggyBank, TrendingUp, Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PatrimonioPage() {
  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in-up mb-8 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-md"
          style={{ backgroundColor: "#056b63" }}
        >
          <Wallet size={20} strokeWidth={1.75} className="text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl text-foreground">Patrimonio</h1>
        </div>
        <Badge variant="green">Fase 5</Badge>
      </div>

      {/* Description */}
      <p
        className="animate-fade-in-up mb-8 max-w-lg text-sm text-text-secondary"
        style={{ animationDelay: "100ms" }}
      >
        Tu patrimonio neto, inversiones y P&amp;L. Próximamente.
      </p>

      {/* Skeleton preview */}
      <div
        className="animate-fade-in-up grid gap-4 sm:grid-cols-3"
        style={{ animationDelay: "200ms" }}
      >
        {[
          { icon: PiggyBank, label: "Ahorro" },
          { icon: TrendingUp, label: "Inversiones" },
          { icon: Landmark, label: "Patrimonio neto" },
        ].map(({ icon: Icon, label }) => (
          <Card key={label} padding="md" className="relative overflow-hidden">
            <div className="flex items-center gap-2 text-text-tertiary">
              <Icon size={16} strokeWidth={1.5} />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full rounded-full bg-sand" />
              <div className="h-2 w-3/4 rounded-full bg-sand" />
              <div className="h-2 w-1/2 rounded-full bg-sand" />
            </div>
            <div className="absolute -bottom-2 -right-2 opacity-[0.04]">
              <Wallet size={64} strokeWidth={1} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
