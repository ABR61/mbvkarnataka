import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

// Shown while a trainee portal page's server work is in flight.
export default function PortalLoading() {
  return (
    <div
      className="mx-auto w-full max-w-4xl flex-1 px-4 py-8"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-7 w-56" />
      <div className="mt-8 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
          >
            <Skeleton className="h-5 w-40" />
            <SkeletonText lines={2} className="mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
