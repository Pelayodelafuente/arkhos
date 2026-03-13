import { Wallet } from "lucide-react";

export default function PatrimonioPage() {
  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ backgroundColor: "#5B8C6A" }}>
          <Wallet size={20} strokeWidth={1.75} className="text-white" />
        </div>
        <h1 className="font-heading text-2xl text-foreground">Patrimonio</h1>
      </div>
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-text-tertiary">Módulo en desarrollo</p>
      </div>
    </div>
  );
}
