import { Skeleton } from "@/components/ui"

// Skeleton genérico para las rutas del dashboard sin loading propio
// (/, /proyectos, /notas, /settings). Gastos/Mercados/Patrimonio tienen el suyo.
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="mt-3 h-8 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="mt-4 h-48 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
