import { TrendingUp, BarChart3, LineChart, CandlestickChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MercadosPage() {
  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in-up mb-8 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-md"
          style={{ backgroundColor: "#7260C4" }}
        >
          <TrendingUp size={20} strokeWidth={1.75} className="text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl text-foreground">Mercados</h1>
        </div>
        <Badge variant="gold">Fase 4</Badge>
      </div>

      {/* Description */}
      <p
        className="animate-fade-in-up mb-8 max-w-lg text-sm text-text-secondary"
        style={{ animationDelay: "100ms" }}
      >
        Seguimiento en tiempo real de cripto y mercados financieros. En desarrollo.
      </p>

      {/* Skeleton preview */}
      <div
        className="animate-fade-in-up grid gap-4 sm:grid-cols-3"
        style={{ animationDelay: "200ms" }}
      >
        {[
          { icon: BarChart3, label: "Portfolio" },
          { icon: LineChart, label: "Watchlist" },
          { icon: CandlestickChart, label: "Análisis" },
        ].map(({ icon: Icon, label }) => (
          <Card key={label} padding="md" className="relative overflow-hidden">
            <div className="flex items-center gap-2 text-text-tertiary">
              <Icon size={16} strokeWidth={1.5} />
              <span className="text-xs font-medium">{label}</span>
            </div>
            {/* Skeleton bars */}
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full rounded-full bg-sand" />
              <div className="h-2 w-3/4 rounded-full bg-sand" />
              <div className="h-2 w-1/2 rounded-full bg-sand" />
            </div>
            {/* Watermark icon */}
            <div className="absolute -bottom-2 -right-2 opacity-[0.04]">
              <TrendingUp size={64} strokeWidth={1} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
