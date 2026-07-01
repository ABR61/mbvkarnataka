"use server";

import { revalidatePath } from "next/cache";
import { forbidden, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { writeAudit } from "@/lib/audit";

const PERMISSION = "feedback.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

/** Publish/unpublish a participant's feedback — super admin (no district) only. */
export async function setFeedbackApproval(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  if (scopedDistrictId(session) !== null) forbidden();

  const id = formData.get("id") as string;
  const approved = formData.get("approved") === "true";
  if (!id) return;

  await prisma.feedback.update({ where: { id }, data: { approved } });
  await writeAudit(session.user.id, "update", "Feedback", id, { approved });

  revalidatePath(`/${locale}/admin/feedback`);
  revalidatePath(`/${locale}/future-programs`);
  redirect(`/${locale}/admin/feedback`);
}

export async function deleteFeedback(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  const fb = await prisma.feedback.findUnique({
    where: { id },
    include: { completion: { select: { districtId: true } } },
  });
  if (!fb) return;
  assertDistrict(session, fb.completion.districtId); // branch admins only their district

  await prisma.feedback.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Feedback", id);

  revalidatePath(`/${locale}/admin/feedback`);
  revalidatePath(`/${locale}/future-programs`);
  redirect(`/${locale}/admin/feedback`);
}
