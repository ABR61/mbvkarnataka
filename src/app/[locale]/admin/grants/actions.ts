"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { parseDate } from "@/lib/validation/cohort";
import { grantInput } from "@/lib/validation/expense";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const PERMISSION = "finance.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function parse(formData: FormData) {
  return grantInput.safeParse({
    funder: formData.get("funder"),
    amount: formData.get("amount"),
    reference: formData.get("reference") ?? "",
    receivedOn: formData.get("receivedOn"),
    purpose: formData.get("purpose") ?? "",
    note: formData.get("note") ?? "",
  });
}

function data(d: ReturnType<typeof grantInput.parse>, formData: FormData) {
  return {
    funder: d.funder,
    amount: d.amount,
    reference: d.reference || null,
    receivedOn: parseDate(d.receivedOn) ?? new Date(),
    purpose: d.purpose || null,
    restricted: formData.get("restricted") === "on",
    foreignSource: formData.get("foreignSource") === "on",
    note: d.note || null,
  };
}

export async function createGrant(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const grant = await prisma.grant.create({
    data: { ...data(parsed.data, formData), createdById: session.user.id },
  });
  await writeAudit(session.user.id, "create", "Grant", grant.id);

  revalidatePath(`/${locale}/admin/grants`);
  redirect(`/${locale}/admin/grants`);
}

export async function updateGrant(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  await prisma.grant.update({ where: { id }, data: data(parsed.data, formData) });
  await writeAudit(session.user.id, "update", "Grant", id);

  revalidatePath(`/${locale}/admin/grants`);
  redirect(`/${locale}/admin/grants`);
}

export async function deleteGrant(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  // Don't destroy the fund trail: a grant that expenses were charged against
  // cannot be deleted (it would silently unlink those expenses). It must be
  // kept for audit; correct the linkage on the expenses instead.
  const linked = await prisma.expense.count({ where: { grantId: id } });
  if (linked > 0) {
    redirect(`/${locale}/admin/grants?error=inUse`);
  }

  await prisma.grant.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Grant", id);

  revalidatePath(`/${locale}/admin/grants`);
  redirect(`/${locale}/admin/grants`);
}
