"use client";

import { Skeleton } from "@/components/ui";

export function ProjectsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="mb-3 flex items-start gap-3">
            <Skeleton rounded="lg" className="h-9 w-9 flex-shrink-0" />
            <div className="flex-1">
              <Skeleton rounded="md" className="mb-1.5 h-4 w-3/4" />
              <Skeleton rounded="md" className="h-3 w-1/3" />
            </div>
            <Skeleton rounded="full" className="h-5 w-16" />
          </div>
          <div className="mb-3 flex gap-1.5">
            <Skeleton rounded="md" className="h-4 w-12" />
            <Skeleton rounded="md" className="h-4 w-16" />
            <Skeleton rounded="md" className="h-4 w-10" />
          </div>
          <Skeleton rounded="full" className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}
