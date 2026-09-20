import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rpInfo, AUTH_CHALLENGE_COOKIE } from "@/lib/webauthn";
import { rateLimitApiRoute } from "@/lib/rate-limit-api";
import { RATE_LIMITS } from "@/lib/rate-limit-config";

// Public: anyone at the kiosk can request an authentication challenge; only a
// registered biometric can actually pass verification.
export async function POST(req: Request) {
  const limited = await rateLimitApiRoute(req, {
    bucket: "webauthn",
    limit: RATE_LIMITS.webauthn.limit,
    windowSec: RATE_LIMITS.webauthn.windowSec,
  });
  if (limited) return limited;

  const { rpID } = await rpInfo();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    // no allowCredentials → discoverable credential picks the staff member
  });

  const jar = await cookies();
  jar.set(AUTH_CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 300,
    path: "/",
  });

  return NextResponse.json(options);
}
