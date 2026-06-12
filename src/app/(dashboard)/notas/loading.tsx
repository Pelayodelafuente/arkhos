import { Skeleton } from "@/components/ui";

export default function NotasLoading() {
  return (
    <div className="flex h-full gap-4">
      {/* Sidebar skeleton */}
      <div className="hidden w-56 shrink-0 space-y-2 lg:block">
        <Skeleton className="h-9 w-full rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>

      {/* Notes list skeleton */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="mt-3 h-3 w-full rounded" />
              <Skeleton className="mt-2 h-3 w-5/6 rounded" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
