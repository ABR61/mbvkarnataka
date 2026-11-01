"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { checkRateLimit, recordFailure } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import { getClientIp } from "@/lib/client-ip";
import { writeAudit } from "@/lib/audit";
import { homeForEmail, homePath } from "@/lib/home";
import { safeInternalPath } from "@/lib/safe-path";

export type SignInState = {
  error?: "invalid" | "unknown" | "rate_limited";
  /** Seconds to wait before retrying — set only when error is "rate_limited". */
  retryAfter?: number;
};

/**
 * Credentials sign-in, invoked from the sign-in form via useActionState.
 *
 * Auth.js v5 behavior: on success, `signIn` with `redirectTo` throws a NEXT_REDIRECT
 * control-flow exception (which we must rethrow); on bad credentials it throws an
 * AuthError, which we catch and surface as form state.
 */
export async function authenticate(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const locale = (formData.get("locale") as string) || "en";
  const callbackUrl = formData.get("callbackUrl") as string | null;

  // Throttle credential guessing per email+IP. Combining the two means one
  // attacker IP can't spray many accounts, and one shared office IP can't lock
  // a whole branch out of a single account. Only failed attempts are counted
  // (below), so a successful login or an honest typo followed by success is fine.
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const ip = getClientIp(await headers());
  const rlKey = `${email}|${ip}`;
  const gate = await checkRateLimit({
    bucket: "login",
    key: rlKey,
    limit: RATE_LIMITS.login.limit,
    windowSec: RATE_LIMITS.login.windowSec,
  });
  if (!gate.ok) {
    await writeAudit(undefined, "blocked", "auth.login", email || undefined, {
      ip,
      reason: "rate_limited",
    });
    return { error: "rate_limited", retryAfter: gate.retryAfter };
  }

  // Land each person in their own area (trainer / admin / portal) instead of
  // bouncing everyone through /admin. Only used if the password is correct.
  const redirectTo =
    safeInternalPath(callbackUrl) ??
    homePath(await homeForEmail(((formData.get("email") as string) ?? "").trim()), locale);

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      // Count only genuine bad-credential failures toward the limit.
      if (error.type === "CredentialsSignin") {
        await recordFailure({
          bucket: "login",
          key: rlKey,
          windowSec: RATE_LIMITS.login.windowSec,
        });
        return { error: "invalid" };
      }
      return { error: "unknown" };
    }
    throw error; // re-throw the redirect (and anything else)
  }
}

/** Sign out and return to the localized sign-in page. */
export async function signOutAction(formData: FormData): Promise<void> {
  const locale = (formData.get("locale") as string) || "en";
  await signOut({ redirectTo: `/${locale}/sign-in` });
}
