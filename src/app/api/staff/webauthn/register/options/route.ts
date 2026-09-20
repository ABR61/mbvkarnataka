import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { scopedDistrictId } from "@/lib/branch-scope";
import { prisma } from "@/lib/prisma";
import {
  rpInfo,
  RP_NAME,
  fromB64url,
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

  const { personId } = (await req.json().catch(() => ({}))) as { personId?: string };
  if (!personId) return NextResponse.json({ error: "personId required" }, { status: 400 });

  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: { credentials: true },
  });
  if (!person || (person.kind !== "STAFF" && person.kind !== "TRAINER")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // Branch admins may only enrol their own district's staff.
  const scope = scopedDistrictId(session);
  if (scope && person.districtId !== scope) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { rpID } = await rpInfo();
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: person.id,
    userName: [person.firstName, person.lastName].filter(Boolean).join(" ") || person.id,
    attestationType: "none",
    excludeCredentials: person.credentials.map((c) => ({
      id: fromB64url(c.credentialId),
      type: "public-key",
    })),
    authenticatorSelection: {
      residentKey: "required",
      requireResidentKey: true,
      userVerification: "required",
    },
  });

  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(REG_CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 300,
    path: "/",
  });
  jar.set(REG_PERSON_COOKIE, person.id, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 300,
    path: "/",
  });

  return NextResponse.json(options);
}
