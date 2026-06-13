import { Skeleton } from "@/components/ui"

export default function AgendaLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {/* Header skeleton */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-1 w-10 rounded-full" />
          <Skeleton className="h-8 w-40 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Day groups */}
      <div className="flex flex-col gap-8">
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className="flex flex-col gap-3">
            <Skeleton className="h-5 w-44 rounded" />
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
