"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { writeAudit } from "@/lib/audit";
import { parseDate } from "@/lib/validation/cohort";
import { expenseInput, expenseFromForm } from "@/lib/validation/expense";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const PERMISSION = "expense.record" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function expenseData(d: ReturnType<typeof expenseInput.parse>) {
  return {
    amount: d.amount, // string → Prisma Decimal (precise)
    incurredOn: parseDate(d.incurredOn) ?? new Date(),
    category: d.category || null,
    vendorId: d.vendorId || null,
    note: d.note || null,
    programId: d.programId || null,
    cohortId: d.cohortId || null,
    centerId: d.centerId || null,
    status: d.status,
  };
}

/** The district a spend belongs to: a branch admin's own district (pinned),
 *  else the one a super admin picked, else the existing value. */
function districtFor(
  session: Awaited<ReturnType<typeof requirePermission>>,
  formData: FormData,
  fallback: string | null = null,
): string | null {
  const scope = scopedDistrictId(session);
  if (scope) return scope;
  const chosen = ((formData.get("districtId") as string) ?? "").trim();
  return chosen || fallback;
}

export async function createExpense(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const parsed = expenseInput.safeParse(expenseFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const expense = await prisma.expense.create({
    data: {
      ...expenseData(parsed.data),
      districtId: districtFor(session, formData),
      createdById: session.user.id,
    },
  });
  await writeAudit(session.user.id, "create", "Expense", expense.id);

  revalidatePath(`/${locale}/admin/expenses`);
  redirect(`/${locale}/admin/expenses`);
}

export async function updateExpense(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { districtId: true },
  });
  if (!existing) return { error: "notFound" };
  assertDistrict(session, existing.districtId); // branch admins: own district only

  const parsed = expenseInput.safeParse(expenseFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  await prisma.expense.update({
    where: { id },
    data: {
      ...expenseData(parsed.data),
      districtId: districtFor(session, formData, existing.districtId),
    },
  });
  await writeAudit(session.user.id, "update", "Expense", id);

  revalidatePath(`/${locale}/admin/expenses`);
  redirect(`/${locale}/admin/expenses`);
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { districtId: true },
  });
  if (!existing) return;
  assertDistrict(session, existing.districtId); // branch admins: own district only

  await prisma.expense.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Expense", id);

  revalidatePath(`/${locale}/admin/expenses`);
  redirect(`/${locale}/admin/expenses`);
}
