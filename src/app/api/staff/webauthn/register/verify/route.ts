import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { scopedDistrictId } from "@/lib/branch-scope";
import { prisma } from "@/lib/prisma";
import {
  rpInfo,
  toB64url,
  REG_CHALLENGE_COOKIE,
  REG_PERSON_COOKIE,
} from "@/lib/webauthn";
import { rateLimitApiRoute } from "@/lib/rate-limit-api";
import { RATE_LIMITS } from "@/lib/rate-limit-config";

export async function POST(req: Request) {
  const limited = await rateLimitApiRoute(req, {
    bucket: "webauthn",
    limit: RATE_LIMITS.webauthn.limit,
    windowSec: RATE_LIMITS.webauthn.windowSec,
  });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user || !hasPermission(session.user.permissions, "staff.manage")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const jar = await cookies();
  const expectedChallenge = jar.get(REG_CHALLENGE_COOKIE)?.value;
  const personId = jar.get(REG_PERSON_COOKIE)?.value;
  if (!expectedChallenge || !personId) {
    return NextResponse.json({ error: "no challenge" }, { status: 400 });
  }

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person || (person.kind !== "STAFF" && person.kind !== "TRAINER")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const scope = scopedDistrictId(session);
  if (scope && person.districtId !== scope) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { rpID, origin } = await rpInfo();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "not verified" }, { status: 400 });
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
  await prisma.staffCredential.create({
    data: {
      personId: person.id,
      credentialId: toB64url(credentialID),
      publicKey: toB64url(credentialPublicKey),
      counter,
      transports: Array.isArray(body.response?.transports)
        ? body.response.transports.join(",")
        : null,
      deviceLabel: null,
    },
  });

  jar.delete(REG_CHALLENGE_COOKIE);
  jar.delete(REG_PERSON_COOKIE);
  return NextResponse.json({ verified: true });
}
