import type { ReactNode } from "react";
import { auth } from "@/auth";
import { hasPermission, type Permission } from "@/lib/rbac";

/**
 * Conditionally renders children based on the current user's permissions.
 * Async Server Component — reads the session directly, no client JS.
 *
 *   <Can permission="cohort.manage"><NewCohortButton /></Can>
 *
 * This is a UI convenience only; always enforce on the server too (requirePermission).
 */
export async function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const session = await auth();
  return hasPermission(session?.user?.permissions, permission) ? (
    <>{children}</>
  ) : (
    <>{fallback}</>
  );
}
