import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

// Shown while a public marketing page's server work is in flight.
export default function PublicLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-10"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <SkeletonText lines={3} className="mt-6 max-w-2xl" />
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
          >
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <SkeletonText lines={2} />
          </div>
        ))}
      </div>
    </div>
  );
}
