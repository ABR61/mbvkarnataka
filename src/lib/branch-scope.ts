// District (branch) scoping for branch admins. PURE module — no next/prisma imports —
// so it is unit-testable and usable from both server components and server actions.
//
// A branch admin has a `districtId` on their user/session and may only see or manage
// records in that district. A super admin has no districtId and is unrestricted.

type ScopableSession =
  | { user?: { districtId?: string | null } | null }
  | null
  | undefined;

/** The district a session is restricted to, or null when unrestricted (super admin). */
export function scopedDistrictId(session: ScopableSession): string | null {
  return session?.user?.districtId ?? null;
}

/**
 * Merge a district restriction into a Prisma `where` filter. When `districtId` is set
 * (branch admin), it is applied LAST so it always wins over any caller-supplied value;
 * when null (super admin), the filter is returned unchanged.
 */
export function withDistrictScope<T extends object>(
  where: T,
  districtId: string | null,
): T & { districtId?: string } {
  return districtId ? { ...where, districtId } : where;
}
