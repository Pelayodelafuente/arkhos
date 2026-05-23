import { Skeleton } from "@/components/ui";

export default function GastosLoading() {
  return (
    <div className="space-y-6">
      {/* KPI Cards skeleton — 4 cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="mt-3 h-8 w-24 rounded" />
            <Skeleton className="mt-2 h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>

      {/* Subscription list skeleton */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <Skeleton className="h-8 w-56 rounded-lg" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
