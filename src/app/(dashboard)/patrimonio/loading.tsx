import { Skeleton } from "@/components/ui";

export default function PatrimonioLoading() {
  return (
    <div className="space-y-6">
      {/* KPI Cards skeleton — 5 cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="mt-3 h-8 w-32 rounded" />
            <Skeleton className="mt-2 h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <Skeleton className="mt-4 h-7 w-28 rounded" />
            <Skeleton className="mt-2 h-4 w-20 rounded-full" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card">
        {/* Table header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        {/* Table rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="ml-auto h-4 w-12 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
