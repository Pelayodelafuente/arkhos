"use client"

import { Skeleton } from "@/components/ui"

export function GastosLoading() {
  return (
    <div className="space-y-6">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-8 w-24 rounded mt-3" />
            <Skeleton className="h-4 w-20 rounded-full mt-2" />
          </div>
        ))}
      </div>

      {/* Calendar skeleton */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-7 w-32 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 rounded" />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={`cell-${i}`} className="h-12 rounded-xl" />
          ))}
        </div>
      </div>

      {/* List skeleton */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
            <Skeleton className="h-4 w-32 rounded flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
