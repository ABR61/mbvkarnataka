import type { ReactNode } from "react";

export type Tone = "green" | "blue" | "amber" | "red" | "gray";

const tones: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

/** Small coloured pill for statuses, counts, and tags. */
export function Badge({
  tone = "gray",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// Default tone for common domain statuses (finance, placements, applications…).
// Unknown statuses fall back to gray.
const STATUS_TONES: Record<string, Tone> = {
  PAID: "green",
  ACTIVE: "green",
  APPROVED: "blue",
  PLACED: "green",
  COMPLETED: "green",
  PENDING: "amber",
  SUBMITTED: "amber",
  REVIEWING: "blue",
  REJECTED: "red",
  CANCELLED: "red",
  INACTIVE: "gray",
};

/** Status pill that colours itself from a status code and shows a provided label. */
export function StatusPill({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <Badge tone={STATUS_TONES[status] ?? "gray"}>{label ?? status}</Badge>
  );
}
