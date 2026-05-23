import { Skeleton } from "@/components/ui";

export default function MercadosLoading() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>

      {/* Pulse metrics grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="mt-3 h-7 w-20 rounded" />
            <Skeleton className="mt-2 h-4 w-12 rounded-full" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="mt-4 h-48 w-full rounded-lg" />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="mt-4 h-32 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
