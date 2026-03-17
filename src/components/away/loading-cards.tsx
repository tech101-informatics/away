import { Skeleton } from "@/components/ui/skeleton";

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="mb-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  );
}
