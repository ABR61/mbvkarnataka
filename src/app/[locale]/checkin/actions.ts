"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isUniqueViolationOn } from "@/lib/db-errors";
import { checkinSecret, verifyTicket } from "@/lib/checkin-token";
import { distanceMeters, markingWindow } from "@/lib/attendance-rules";
import type { FormState } from "@/lib/forms";

function num(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * A trainee checks themselves in after scanning the session QR. Records them
 * PRESENT with the check-in time and their phone's location. Never overrides
 * a status the trainer has already recorded — the trainer stays the authority.
 */
export async function selfCheckIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requireAuth();
  const sessionId = (formData.get("sessionId") as string) ?? "";
  const ticket = (formData.get("ticket") as string) ?? "";

  const gate = await consumeRateLimit({ bucket: "checkin", key: session.user.id, limit: 20, windowSec: 600 });
  if (!gate.ok) return { error: "rateLimited" };
  if (!sessionId || !verifyTicket(checkinSecret(), sessionId, ticket, Date.now())) return { error: "expired" };

  const person = await prisma.person.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!person) return { error: "notTrainee" };

  const ts = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: {
      cohortId: true,
      sessionDate: true,
      status: true,
      cohort: { select: { center: { select: { latitude: true, longitude: true } } } },
    },
  });
  if (!ts || ts.status === "CANCELLED" || markingWindow(ts.sessionDate) !== "open") return { error: "closed" };

  const enrolled = await prisma.enrollment.findFirst({
    where: { cohortId: ts.cohortId, personId: person.id, status: { not: "DROPPED" } },
    select: { id: true },
  });
  if (!enrolled) return { error: "notEnrolled" };

  const existing = await prisma.attendance.findUnique({
    where: { sessionId_personId: { sessionId, personId: person.id } },
    select: { selfCheckedInAt: true },
  });
  if (existing) return { error: existing.selfCheckedInAt ? "already" : "alreadyMarked" };

  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));
  const accuracy = num(formData.get("accuracy"));
  const center = ts.cohort.center;
  const distance =
    lat !== null && lng !== null && center.latitude != null && center.longitude != null
      ? Math.round(distanceMeters({ lat, lng }, { lat: center.latitude, lng: center.longitude }))
      : null;

  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.attendance.create({
        data: {
          sessionId,
          personId: person.id,
          status: "PRESENT",
          markedById: session.user.id,
          markedAt: now,
          selfCheckedInAt: now,
          checkInLat: lat,
          checkInLng: lng,
          checkInAccuracyM: accuracy !== null ? Math.round(accuracy) : null,
          checkInDistanceM: distance,
        },
      });
      await tx.attendanceLog.create({
        data: {
          sessionId,
          personId: person.id,
          fromStatus: null,
          toStatus: "PRESENT",
          kind: "SELF_CHECKIN",
          changedById: session.user.id,
        },
      });
    });
  } catch (e) {
    // The trainer saved the roster at the same moment — theirs stands.
    if (isUniqueViolationOn(e, "sessionId") || isUniqueViolationOn(e, "personId")) {
      return { error: "alreadyMarked" };
    }
    throw e;
  }
  await writeAudit(session.user.id, "create", "Attendance", sessionId, {
    selfCheckIn: true,
    distanceM: distance,
  });

  revalidatePath(`/${locale}/portal`);
  return { ok: true };
}
