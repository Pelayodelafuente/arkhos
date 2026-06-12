import { Skeleton } from "@/components/ui";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-8 w-40 rounded-lg" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="mt-4 h-9 w-full rounded-md" />
          <Skeleton className="mt-3 h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
