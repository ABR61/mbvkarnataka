import "server-only";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, type Permission } from "@/lib/rbac";

// Default sign-in target. next-intl's proxy redirects a locale-less path to the
// default locale, but callers inside a localized route should pass `/${locale}/sign-in`.
const SIGN_IN_PATH = "/sign-in";

/** Returns the current session, or redirects to sign-in if there is none. */
export async function requireAuth(redirectTo: string = SIGN_IN_PATH) {
  const session = await auth();
  if (!session?.user) redirect(redirectTo);
  return session;
}

/**
 * Guards a Server Component or Server Action: the caller must be signed in AND hold
 * `permission`. Anonymous users are redirected to sign-in; signed-in users who lack
 * the permission get the branded 403 (forbidden.tsx) via Next's forbidden().
 */
export async function requirePermission(
  permission: Permission,
  redirectTo: string = SIGN_IN_PATH,
) {
  const session = await requireAuth(redirectTo);
  if (!hasPermission(session.user.permissions, permission)) {
    forbidden();
  }
  return session;
}
