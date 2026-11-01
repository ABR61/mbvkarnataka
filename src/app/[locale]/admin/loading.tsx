import { Skeleton } from "@/components/ui/skeleton";

// Shown automatically while any /admin/** page's server work is in flight.
// Mirrors the common admin layout: a title block, a filter row, then a table.
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>

      {/* Title + primary action */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filter / search row */}
      <Skeleton className="h-10 w-full max-w-sm" />

      {/* Table-ish rows */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-32 sm:block" />
            <Skeleton className="hidden h-4 w-20 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
