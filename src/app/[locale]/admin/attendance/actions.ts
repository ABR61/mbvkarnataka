"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/forms";

/**
 * Approve or reject an attendance correction. Separation of duties: the
 * reviewer can't be the person who asked for it, nor the trainee concerned.
 * Approval applies the change and appends a CORRECTION entry to the history,
 * in one transaction.
 */
export async function reviewCorrection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requirePermission("attendance.review");
  const id = (formData.get("id") as string) ?? "";
  const decision = formData.get("decision");
  const note = ((formData.get("note") as string) ?? "").trim();
  if (!id || (decision !== "approve" && decision !== "reject")) return { error: "invalid" };
  if (decision === "reject" && note.length < 3) return { fieldErrors: { note: "required" } };

  const c = await prisma.attendanceCorrection.findUnique({
    where: { id },
    include: {
      person: { select: { userId: true } },
      session: { select: { cohort: { select: { center: { select: { districtId: true } } } } } },
    },
  });
  if (!c) return { error: "notFound" };
  assertDistrict(session, c.session.cohort.center.districtId); // branch admins: own district only
  if (c.status !== "PENDING") return { error: "badState" };
  if (c.requestedById === session.user.id || c.person.userId === session.user.id) {
    return { error: "sameReviewer" };
  }

  const now = new Date();
  if (decision === "approve") {
    await prisma.$transaction(async (tx) => {
      const current = await tx.attendance.findUnique({
        where: { sessionId_personId: { sessionId: c.sessionId, personId: c.personId } },
        select: { status: true },
      });
      await tx.attendance.upsert({
        where: { sessionId_personId: { sessionId: c.sessionId, personId: c.personId } },
        update: { status: c.toStatus, markedById: session.user.id, markedAt: now },
        create: {
          sessionId: c.sessionId,
          personId: c.personId,
          status: c.toStatus,
          markedById: session.user.id,
        },
      });
      await tx.attendanceLog.create({
        data: {
          sessionId: c.sessionId,
          personId: c.personId,
          fromStatus: current?.status ?? null,
          toStatus: c.toStatus,
          kind: "CORRECTION",
          reason: c.reason,
          changedById: session.user.id,
          correctionId: c.id,
        },
      });
      await tx.attendanceCorrection.update({
        where: { id },
        data: { status: "APPROVED", reviewedById: session.user.id, reviewedAt: now, reviewNote: note || null },
      });
    });
  } else {
    await prisma.attendanceCorrection.update({
      where: { id },
      data: { status: "REJECTED", reviewedById: session.user.id, reviewedAt: now, reviewNote: note },
    });
  }
  await writeAudit(session.user.id, "update", "AttendanceCorrection", id, { decision });

  revalidatePath(`/${locale}/admin/attendance`);
  return { ok: true };
}
