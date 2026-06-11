"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type SignInState = { error?: "invalid" | "unknown" };

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
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: `/${locale}/admin`,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: error.type === "CredentialsSignin" ? "invalid" : "unknown" };
    }
    throw error; // re-throw the redirect (and anything else)
  }
}

/** Sign out and return to the localized sign-in page. */
export async function signOutAction(formData: FormData): Promise<void> {
  const locale = (formData.get("locale") as string) || "en";
  await signOut({ redirectTo: `/${locale}/sign-in` });
}
