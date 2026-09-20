import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { rpInfo, fromB64url, AUTH_CHALLENGE_COOKIE } from "@/lib/webauthn";
import { rateLimitApiRoute } from "@/lib/rate-limit-api";
import { RATE_LIMITS } from "@/lib/rate-limit-config";

export async function POST(req: Request) {
  const limited = await rateLimitApiRoute(req, {
    bucket: "webauthn",
    limit: RATE_LIMITS.webauthn.limit,
    windowSec: RATE_LIMITS.webauthn.windowSec,
  });
  if (limited) return limited;

  const jar = await cookies();
  const expectedChallenge = jar.get(AUTH_CHALLENGE_COOKIE)?.value;
  if (!expectedChallenge) {
    return NextResponse.json({ error: "no challenge" }, { status: 400 });
  }

  const body = await req.json();
  // The credential id (body.id) tells us which enrolled device / staff it is.
  const cred = await prisma.staffCredential.findUnique({
    where: { credentialId: String(body.id ?? "") },
    include: { person: true },
  });
  if (!cred) return NextResponse.json({ error: "unknown device" }, { status: 404 });

  const { rpID, origin } = await rpInfo();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      authenticator: {
        credentialID: fromB64url(cred.credentialId),
        credentialPublicKey: fromB64url(cred.publicKey),
        counter: cred.counter,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "not verified" }, { status: 400 });
  }

  // Keep the signature counter fresh (replay protection).
  await prisma.staffCredential.update({
    where: { id: cred.id },
    data: { counter: verification.authenticationInfo.newCounter },
  });

  // Record the clock-in / clock-out for today (local wall-clock time).
  const now = new Date();
  const dayStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD, local tz
  const time = now.toLocaleTimeString("en-GB", { hour12: false }).slice(0, 5); // HH:MM
  const date = new Date(`${dayStr}T00:00:00.000Z`);

  const existing = await prisma.staffAttendance.findUnique({
    where: { personId_date: { personId: cred.personId, date } },
  });

  let action: "in" | "out";
  if (!existing || !existing.checkIn) {
    await prisma.staffAttendance.upsert({
      where: { personId_date: { personId: cred.personId, date } },
      create: {
        personId: cred.personId,
        date,
        status: "PRESENT",
        checkIn: time,
        districtId: cred.person.districtId,
      },
      update: { status: "PRESENT", checkIn: time },
    });
    action = "in";
  } else {
    await prisma.staffAttendance.update({
      where: { id: existing.id },
      data: { checkOut: time },
    });
    action = "out";
  }

  jar.delete(AUTH_CHALLENGE_COOKIE);
  return NextResponse.json({
    verified: true,
    action,
    time,
    name: [cred.person.firstName, cred.person.lastName].filter(Boolean).join(" "),
  });
}
