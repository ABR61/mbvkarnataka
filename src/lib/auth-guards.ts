import "server-only";
import { redirect } from "next/navigation";
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
 * `permission`. Redirects anonymous users to sign-in; throws for signed-in users who
 * lack the permission (surfaces as a server error — a 403 page comes in a later slice).
 */
export async function requirePermission(
  permission: Permission,
  redirectTo: string = SIGN_IN_PATH,
) {
  const session = await requireAuth(redirectTo);
  if (!hasPermission(session.user.permissions, permission)) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
  return session;
}
