"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { isUniqueViolationOn } from "@/lib/db-errors";
import {
  cohortInput,
  cohortFromForm,
  parseDate,
  ENROLLMENT_STATUSES,
} from "@/lib/validation/cohort";
import { randomCode, certificateSerial } from "@/lib/certificate";
import { zodFieldErrors, type FormState } from "@/lib/forms";
import { withFlash } from "@/lib/flash";

const PERMISSION = "cohort.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function cohortData(d: ReturnType<typeof cohortInput.parse>) {
  return {
    programId: d.programId,
    centerId: d.centerId,
    coordinatorId: d.coordinatorId || null,
    code: d.code || null,
    startDate: parseDate(d.startDate),
    endDate: parseDate(d.endDate),
    capacity: d.capacity,
    status: d.status,
  };
}

export async function createCohort(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const parsed = cohortInput.safeParse(cohortFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  let cohort;
  try {
    cohort = await prisma.cohort.create({ data: cohortData(parsed.data) });
  } catch (e) {
    if (isUniqueViolationOn(e, "code")) return { fieldErrors: { code: "taken" } };
    console.error("[cohorts] create failed:", e);
    return { error: "saveFailed" };
  }
  await writeAudit(session.user.id, "create", "Cohort", cohort.id);

  revalidatePath(`/${locale}/admin/cohorts`);
  redirect(withFlash(`/${locale}/admin/cohorts/${cohort.id}/edit`, "saved"));
}

export async function updateCohort(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = cohortInput.safeParse(cohortFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    await prisma.cohort.update({ where: { id }, data: cohortData(parsed.data) });
  } catch (e) {
    if (isUniqueViolationOn(e, "code")) return { fieldErrors: { code: "taken" } };
    console.error("[cohorts] update failed:", e);
    return { error: "saveFailed" };
  }
  await writeAudit(session.user.id, "update", "Cohort", id);

  revalidatePath(`/${locale}/admin/cohorts`);
  redirect(withFlash(`/${locale}/admin/cohorts`, "saved"));
}

export async function deleteCohort(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.cohort.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Cohort", id);

  revalidatePath(`/${locale}/admin/cohorts`);
  redirect(withFlash(`/${locale}/admin/cohorts`, "deleted"));
}

// ── Enrollment ──────────────────────────────────────────────

export async function enrollTrainee(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const cohortId = formData.get("cohortId") as string;
  const personId = formData.get("personId") as string;
  if (!cohortId || !personId) return { error: "invalid" };

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { capacity: true, _count: { select: { enrollments: true } } },
  });
  if (!cohort) return { error: "notFound" };

  // Capacity guard.
  if (cohort.capacity != null && cohort._count.enrollments >= cohort.capacity) {
    return { error: "full" };
  }

  // Duplicate guard (also enforced by the unique constraint).
  const existing = await prisma.enrollment.findUnique({
    where: { personId_cohortId: { personId, cohortId } },
  });
  if (existing) return { error: "duplicate" };

  await prisma.enrollment.create({ data: { personId, cohortId } });
  await writeAudit(session.user.id, "create", "Enrollment", undefined, {
    cohortId,
    personId,
  });

  revalidatePath(`/${locale}/admin/cohorts/${cohortId}/edit`);
  return { ok: true };
}

export async function updateEnrollmentStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  const cohortId = formData.get("cohortId") as string;
  const status = formData.get("status") as string;
  if (!id) return { error: "notFound" };
  if (!(ENROLLMENT_STATUSES as readonly string[]).includes(status)) {
    return { error: "invalid" };
  }

  // Exit reason only applies when a trainee leaves early.
  const exitReason =
    status === "DROPPED"
      ? ((formData.get("exitReason") as string) ?? "").trim() || null
      : null;

  await prisma.enrollment.update({
    where: { id },
    data: { status: status as (typeof ENROLLMENT_STATUSES)[number], exitReason },
  });
  await writeAudit(session.user.id, "update", "Enrollment", id, { status });

  revalidatePath(`/${locale}/admin/cohorts/${cohortId}/edit`);
  return { ok: true };
}

export async function unenrollTrainee(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string; // enrollment id
  const cohortId = formData.get("cohortId") as string;
  if (!id) return;

  await prisma.enrollment.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Enrollment", id, { cohortId });

  revalidatePath(`/${locale}/admin/cohorts/${cohortId}/edit`);
}

// ── Trainer assignment ──────────────────────────────────────

export async function assignTrainer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const cohortId = formData.get("cohortId") as string;
  const personId = formData.get("personId") as string;
  const role = (formData.get("role") as string)?.trim() || null;
  if (!cohortId || !personId) return { error: "invalid" };

  const existing = await prisma.trainerAssignment.findUnique({
    where: { personId_cohortId: { personId, cohortId } },
  });
  if (existing) return { error: "duplicate" };

  await prisma.trainerAssignment.create({ data: { personId, cohortId, role } });
  await writeAudit(session.user.id, "create", "TrainerAssignment", undefined, {
    cohortId,
    personId,
  });

  revalidatePath(`/${locale}/admin/cohorts/${cohortId}/edit`);
  return { ok: true };
}

export async function unassignTrainer(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string; // assignment id
  const cohortId = formData.get("cohortId") as string;
  if (!id) return;

  await prisma.trainerAssignment.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "TrainerAssignment", id, { cohortId });

  revalidatePath(`/${locale}/admin/cohorts/${cohortId}/edit`);
}

// ── Certificate ─────────────────────────────────────────────

/**
 * Issue a completion certificate for an enrollment (snapshotting names so the
 * certificate stays valid even if records change later) and mark the enrollment
 * COMPLETED. Idempotent: re-issuing returns the existing certificate.
 */
export async function issueCertificate(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const enrollmentId = formData.get("id") as string;
  const cohortId = formData.get("cohortId") as string;
  if (!enrollmentId) return;

  const existing = await prisma.certificate.findUnique({ where: { enrollmentId } });
  if (existing) return; // already issued

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      person: true,
      cohort: { include: { program: true, center: true } },
    },
  });
  if (!enrollment) return;

  const year = new Date().getUTCFullYear();
  const personName = [enrollment.person.firstName, enrollment.person.lastName]
    .filter(Boolean)
    .join(" ");

  await prisma.$transaction([
    prisma.certificate.create({
      data: {
        enrollmentId,
        personId: enrollment.personId,
        serialNumber: certificateSerial(year, randomCode(6)),
        verifyCode: randomCode(16),
        personName,
        programName: enrollment.cohort.program.name ?? { en: "" },
        centerName: enrollment.cohort.center.name ?? undefined,
        issuedById: session.user.id,
      },
    }),
    prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "COMPLETED" },
    }),
  ]);
  await writeAudit(session.user.id, "create", "Certificate", enrollmentId, {
    cohortId,
  });

  revalidatePath(`/${locale}/admin/cohorts/${cohortId}/edit`);
}
