import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, type Permission } from "@/lib/rbac";

// Where unauthenticated users are sent. Auth.js serves a default sign-in page here;
// Slice 1 replaces this with a branded, localized /[locale]/sign-in route.
const SIGN_IN_PATH = "/api/auth/signin";

/** Returns the current session, or redirects to sign-in if there is none. */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect(SIGN_IN_PATH);
  return session;
}

/**
 * Guards a Server Component or Server Action: the caller must be signed in AND hold
 * `permission`. Redirects anonymous users to sign-in; throws for signed-in users who
 * lack the permission (surfaces as a server error / 500 — Slice 1 adds a 403 page).
 */
export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  if (!hasPermission(session.user.permissions, permission)) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
  return session;
}
