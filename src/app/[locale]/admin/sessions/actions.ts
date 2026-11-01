"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { toLocalizedOrNull } from "@/lib/localized";
import { parseDate } from "@/lib/validation/cohort";
import {
  sessionInput,
  sessionFromForm,
  isAttendanceStatus,
  type AttendanceStatus as AttendanceStatusValue,
} from "@/lib/validation/session";
import { markingWindow, distanceMeters } from "@/lib/attendance-rules";
import { sanitizeImageUrl } from "@/lib/storage";
import { zodFieldErrors, type FormState } from "@/lib/forms";
import { withFlash } from "@/lib/flash";

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function sessionScalars(d: ReturnType<typeof sessionInput.parse>) {
  return {
    cohortId: d.cohortId,
    courseId: d.courseId,
    venueId: d.venueId || null,
    trainerId: d.trainerId || null,
    sessionDate: parseDate(d.sessionDate) ?? new Date(),
    startTime: d.startTime || null,
    endTime: d.endTime || null,
    status: d.status,
  };
}

export async function createSession(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission("session.manage");

  const parsed = sessionInput.safeParse(sessionFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const topic = toLocalizedOrNull(d.topicEn, d.topicKn);

  const created = await prisma.trainingSession.create({
    data: { ...sessionScalars(d), topic: topic ?? undefined },
  });
  await writeAudit(session.user.id, "create", "TrainingSession", created.id);

  revalidatePath(`/${locale}/admin/sessions`);
  redirect(withFlash(`/${locale}/admin/sessions`, "saved"));
}

export async function updateSession(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission("session.manage");
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = sessionInput.safeParse(sessionFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  // Once attendance exists the session is part of the record: moving its date
  // would reopen a locked session for marking (bypassing approved
  // corrections), changing its cohort would orphan the attendance, and
  // cancelling it would silently drop it from everyone's percentage.
  const existing = await prisma.trainingSession.findUnique({
    where: { id },
    select: { cohortId: true, sessionDate: true, status: true, _count: { select: { attendances: true } } },
  });
  if (!existing) return { error: "notFound" };
  if (existing._count.attendances > 0) {
    const newDay = (parseDate(d.sessionDate) ?? new Date()).toISOString().slice(0, 10);
    const oldDay = existing.sessionDate.toISOString().slice(0, 10);
    const newlyCancelled = d.status === "CANCELLED" && existing.status !== "CANCELLED";
    if (d.cohortId !== existing.cohortId || newDay !== oldDay || newlyCancelled) {
      return { error: "attendanceRecorded" };
    }
  }

  const topic = toLocalizedOrNull(d.topicEn, d.topicKn);
  await prisma.trainingSession.update({
    where: { id },
    data: { ...sessionScalars(d), topic: topic ?? Prisma.DbNull },
  });
  await writeAudit(session.user.id, "update", "TrainingSession", id);

  revalidatePath(`/${locale}/admin/sessions`);
  redirect(withFlash(`/${locale}/admin/sessions`, "saved"));
}

export async function deleteSession(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission("session.manage");
  const id = formData.get("id") as string;
  if (!id) return;

  // A session with attendance can't be deleted — that would erase the
  // attendance and its whole change history.
  const marked = await prisma.attendance.count({ where: { sessionId: id } });
  if (marked > 0) redirect(`/${locale}/admin/sessions?error=hasAttendance`);

  await prisma.trainingSession.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "TrainingSession", id);

  revalidatePath(`/${locale}/admin/sessions`);
  redirect(withFlash(`/${locale}/admin/sessions`, "deleted"));
}

/** Parse an optional numeric form field. */
function num(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Mark attendance for every enrolled trainee in the session's cohort.
 *
 * Integrity rules:
 * - Only on the session day (India time). Afterwards the record is locked and
 *   changes go through an approved correction (requestCorrection).
 * - Every trainee needs an explicit status — nobody is marked present by default.
 * - The class photo and the marking phone's location are stored as evidence,
 *   with the distance from the center.
 * - Each change is appended to AttendanceLog in the same transaction.
 */
export async function markAttendance(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission("attendance.mark");
  const sessionId = formData.get("sessionId") as string;
  if (!sessionId) return { error: "invalid" };

  const ts = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: {
      cohortId: true,
      sessionDate: true,
      status: true,
      photoUrl: true,
      firstMarkedAt: true,
      cohort: { select: { center: { select: { latitude: true, longitude: true } } } },
    },
  });
  if (!ts) return { error: "notFound" };
  if (ts.status === "CANCELLED") return { error: "cancelled" };
  const win = markingWindow(ts.sessionDate);
  if (win !== "open") return { error: win === "locked" ? "locked" : "notYet" };

  // Trainees who have dropped out aren't marked any more.
  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId: ts.cohortId, status: { not: "DROPPED" } },
    select: { personId: true },
  });

  // Every (active) trainee must be marked explicitly.
  const marks: { personId: string; status: AttendanceStatusValue }[] = [];
  for (const e of enrollments) {
    const status = formData.get(`status_${e.personId}`);
    if (!isAttendanceStatus(status)) return { error: "incomplete" };
    marks.push({ personId: e.personId, status });
  }

  // Evidence: class photo and where the marking phone was.
  const photoUrl = sanitizeImageUrl((formData.get("photoUrl") as string) ?? "");
  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));
  const accuracy = num(formData.get("accuracy"));
  const center = ts.cohort.center;
  const hasLocation = lat !== null && lng !== null;
  const distance =
    hasLocation && center.latitude != null && center.longitude != null
      ? Math.round(distanceMeters({ lat, lng }, { lat: center.latitude, lng: center.longitude }))
      : null;

  const existing = new Map(
    (
      await prisma.attendance.findMany({
        where: { sessionId },
        select: { personId: true, status: true },
      })
    ).map((a) => [a.personId, a.status]),
  );

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const m of marks) {
      const prev = existing.get(m.personId) ?? null;
      if (prev === m.status) continue; // unchanged — nothing to record
      await tx.attendance.upsert({
        where: { sessionId_personId: { sessionId, personId: m.personId } },
        update: { status: m.status, markedById: session.user.id, markedAt: now },
        create: { sessionId, personId: m.personId, status: m.status, markedById: session.user.id },
      });
      await tx.attendanceLog.create({
        data: {
          sessionId,
          personId: m.personId,
          fromStatus: prev,
          toStatus: m.status,
          kind: "MARK",
          changedById: session.user.id,
        },
      });
    }
    await tx.trainingSession.update({
      where: { id: sessionId },
      data: {
        // Keep earlier evidence if this save didn't include new evidence.
        ...(photoUrl ? { photoUrl } : {}),
        ...(hasLocation
          ? {
              markedLat: lat,
              markedLng: lng,
              markedAccuracyM: accuracy !== null ? Math.round(accuracy) : null,
              markedDistanceM: distance,
            }
          : {}),
        ...(ts.firstMarkedAt ? {} : { firstMarkedAt: now, firstMarkedById: session.user.id }),
      },
    });
  });
  await writeAudit(session.user.id, "update", "Attendance", sessionId, {
    count: marks.length,
    photo: Boolean(photoUrl ?? ts.photoUrl),
    location: hasLocation,
    distanceM: distance,
  });

  revalidatePath(`/${locale}/admin/sessions/${sessionId}/attendance`);
  redirect(withFlash(`/${locale}/admin/sessions/${sessionId}/attendance`, "saved"));
}

/**
 * Ask for an attendance change after the marking window has closed. Takes
 * effect only when someone else approves it (see admin/attendance).
 */
export async function requestCorrection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission("attendance.mark");
  const sessionId = (formData.get("sessionId") as string) ?? "";
  const personId = (formData.get("personId") as string) ?? "";
  const toStatus = formData.get("toStatus");
  const reason = ((formData.get("reason") as string) ?? "").trim();
  if (!sessionId || !personId || !isAttendanceStatus(toStatus)) return { error: "invalid" };
  if (reason.length < 5) return { fieldErrors: { reason: "required" } };

  const ts = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { cohortId: true, sessionDate: true },
  });
  if (!ts) return { error: "notFound" };
  if (markingWindow(ts.sessionDate) === "open") return { error: "stillOpen" };

  const enrolled = await prisma.enrollment.findFirst({
    where: { cohortId: ts.cohortId, personId },
    select: { id: true },
  });
  if (!enrolled) return { error: "invalid" };

  const current = await prisma.attendance.findUnique({
    where: { sessionId_personId: { sessionId, personId } },
    select: { status: true },
  });
  if (current?.status === toStatus) return { error: "noChange" };

  const pending = await prisma.attendanceCorrection.findFirst({
    where: { sessionId, personId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) return { error: "duplicate" };

  const c = await prisma.attendanceCorrection.create({
    data: {
      sessionId,
      personId,
      fromStatus: current?.status ?? null,
      toStatus,
      reason,
      source: "STAFF",
      requestedById: session.user.id,
    },
  });
  await writeAudit(session.user.id, "create", "AttendanceCorrection", c.id, { sessionId, personId });

  revalidatePath(`/${locale}/admin/sessions/${sessionId}/attendance`);
  return { ok: true };
}
