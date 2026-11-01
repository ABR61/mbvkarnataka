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
} from "@/lib/validation/session";
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

  await prisma.trainingSession.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "TrainingSession", id);

  revalidatePath(`/${locale}/admin/sessions`);
  redirect(withFlash(`/${locale}/admin/sessions`, "deleted"));
}

/**
 * Bulk-mark attendance for every enrolled trainee in the session's cohort.
 * Reads one status per person from `status_<personId>` fields; upserts so the
 * roster can be re-saved (editable), stamping markedBy/markedAt.
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
    select: { cohortId: true },
  });
  if (!ts) return { error: "notFound" };

  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId: ts.cohortId },
    select: { personId: true },
  });

  const now = new Date();
  for (const e of enrollments) {
    const status = formData.get(`status_${e.personId}`);
    if (!isAttendanceStatus(status)) continue;
    await prisma.attendance.upsert({
      where: { sessionId_personId: { sessionId, personId: e.personId } },
      update: { status, markedById: session.user.id, markedAt: now },
      create: {
        sessionId,
        personId: e.personId,
        status,
        markedById: session.user.id,
      },
    });
  }
  await writeAudit(session.user.id, "update", "Attendance", sessionId, {
    count: enrollments.length,
  });

  revalidatePath(`/${locale}/admin/sessions/${sessionId}/attendance`);
  redirect(withFlash(`/${locale}/admin/sessions`, "saved"));
}
