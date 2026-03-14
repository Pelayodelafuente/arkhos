import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function MercadosPage() {
  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ backgroundColor: "#9B7A4A" }}>
          <TrendingUp size={20} strokeWidth={1.75} className="text-white" />
        </div>
        <h1 className="font-heading text-2xl text-foreground">Mercados</h1>
      </div>
      <Card padding="lg" className="text-center">
        <p className="text-text-tertiary">Módulo en desarrollo</p>
      </Card>
    </div>
  );
}
