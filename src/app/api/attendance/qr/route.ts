import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { markingWindow } from "@/lib/attendance-rules";
import { checkinSecret, msUntilRotation, qrToken } from "@/lib/checkin-token";

// The rotating QR token for a session's self check-in, plus who has checked in
// so far. Polled by the trainer's attendance screen. Staff only, and only while
// the session's marking window is open.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.permissions, "attendance.mark")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const sessionId = new URL(req.url).searchParams.get("session") ?? "";
  const ts = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { sessionDate: true, status: true },
  });
  if (!ts) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (ts.status === "CANCELLED" || markingWindow(ts.sessionDate) !== "open") {
    return NextResponse.json({ error: "closed" }, { status: 409 });
  }

  const now = Date.now();
  const checkins = await prisma.attendance.findMany({
    where: { sessionId, selfCheckedInAt: { not: null } },
    select: {
      personId: true,
      selfCheckedInAt: true,
      checkInDistanceM: true,
      person: { select: { firstName: true, lastName: true } },
    },
    orderBy: { selfCheckedInAt: "asc" },
  });

  return NextResponse.json(
    {
      token: qrToken(checkinSecret(), sessionId, now),
      rotatesInMs: msUntilRotation(now),
      checkins: checkins.map((c) => ({
        personId: c.personId,
        name: [c.person.firstName, c.person.lastName].filter(Boolean).join(" "),
        at: c.selfCheckedInAt,
        distanceM: c.checkInDistanceM,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
