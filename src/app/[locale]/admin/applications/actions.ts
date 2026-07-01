"use server";

import { revalidatePath } from "next/cache";
import { forbidden, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { writeAudit } from "@/lib/audit";
import { APPLICATION_STATUSES } from "@/lib/validation/application";
import type { FormState } from "@/lib/forms";

const PERMISSION = "application.manage" as const;

// Statuses a branch admin may set — the first-stage approval and rejection only.
// Final approval (ACCEPTED) and conversion stay with the super admin.
const BRANCH_ALLOWED_STATUSES = ["UNDER_REVIEW", "BRANCH_APPROVED", "REJECTED"] as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

export async function updateApplication(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id) return { error: "notFound" };
  if (!(APPLICATION_STATUSES as readonly string[]).includes(status)) {
    return { error: "invalid" };
  }

  // Branch admins may only act on applications in their own district.
  const target = await prisma.application.findUnique({
    where: { id },
    select: { districtId: true },
  });
  if (!target) return { error: "notFound" };
  assertDistrict(session, target.districtId);

  // Two-stage approval: a branch admin can only send an application up for
  // final approval (BRANCH_APPROVED) or reject it — never grant final approval.
  if (scopedDistrictId(session) !== null) {
    if (!(BRANCH_ALLOWED_STATUSES as readonly string[]).includes(status)) {
      forbidden();
    }
  }

  await prisma.application.update({
    where: { id },
    data: {
      status: status as (typeof APPLICATION_STATUSES)[number],
      reviewNote: ((formData.get("reviewNote") as string) ?? "").trim() || null,
    },
  });
  await writeAudit(session.user.id, "update", "Application", id, { status });

  revalidatePath(`/${locale}/admin/applications/${id}`);
  return { ok: true };
}

/**
 * Convert an application into a Person(TRAINEE) + a DPDP consent record, and
 * optionally enroll into a cohort. Sets status CONVERTED and links personId.
 */
export async function convertApplication(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  const cohortId = ((formData.get("cohortId") as string) ?? "").trim();
  if (!id) return { error: "notFound" };

  // Converting to a trainee is the final step — super admin only.
  if (scopedDistrictId(session) !== null) forbidden();

  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return { error: "notFound" };
  if (app.personId) return { error: "alreadyConverted" };

  // Capacity guard before we mutate, if a cohort was chosen.
  if (cohortId) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { capacity: true, _count: { select: { enrollments: true } } },
    });
    if (!cohort) return { error: "cohortNotFound" };
    if (cohort.capacity != null && cohort._count.enrollments >= cohort.capacity) {
      return { error: "cohortFull" };
    }
  }

  const person = await prisma.$transaction(async (tx) => {
    const created = await tx.person.create({
      data: {
        kind: "TRAINEE",
        firstName: app.firstName,
        lastName: app.lastName,
        phone: app.phone,
        email: app.email,
        gender: app.gender,
        dateOfBirth: app.dateOfBirth,
        districtId: app.districtId,
      },
    });
    await tx.consentRecord.create({
      data: {
        personId: created.id,
        consentType: "data_processing",
        version: "v1-admission",
        grantedAt: app.consentAt ?? new Date(),
        ipAddress: app.ipAddress,
      },
    });
    if (cohortId) {
      await tx.enrollment.create({ data: { personId: created.id, cohortId } });
    }
    await tx.application.update({
      where: { id },
      data: { status: "CONVERTED", personId: created.id },
    });
    return created;
  });
  await writeAudit(session.user.id, "update", "Application", id, {
    converted: true,
    personId: person.id,
    cohortId: cohortId || null,
  });

  revalidatePath(`/${locale}/admin/applications`);
  redirect(`/${locale}/admin/trainees/${person.id}/edit`);
}
