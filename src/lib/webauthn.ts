import "server-only";
import { headers } from "next/headers";

export const RP_NAME = "MBV Staff Attendance";

// Cookie names carrying the one-time challenge between the options and verify steps.
export const REG_CHALLENGE_COOKIE = "wa_reg_challenge";
export const REG_PERSON_COOKIE = "wa_reg_person";
export const AUTH_CHALLENGE_COOKIE = "wa_auth_challenge";

/**
 * WebAuthn relying-party info derived from the request host, so it works on
 * localhost (dev) and on whatever domain the app is deployed to. The rpID is the
 * hostname without the port; the origin is the full scheme+host.
 */
export async function rpInfo(): Promise<{ rpID: string; origin: string }> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const rpID = host.split(":")[0];
  const proto = h.get("x-forwarded-proto") ?? (rpID === "localhost" ? "http" : "https");
  return { rpID, origin: `${proto}://${host}` };
}

export function toB64url(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

export function fromB64url(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64url"));
}
