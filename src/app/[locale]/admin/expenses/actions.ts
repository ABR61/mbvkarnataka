"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { writeAudit } from "@/lib/audit";
import { parseDate } from "@/lib/validation/cohort";
import {
  expenseInput,
  expenseFromForm,
  payInput,
  payFromForm,
  voidInput,
} from "@/lib/validation/expense";
import { zodFieldErrors, type FormState } from "@/lib/forms";
import { sanitizeImageUrl } from "@/lib/storage";
import { withFlash } from "@/lib/flash";

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
    grantId: d.grantId || null,
    note: d.note || null,
    programId: d.programId || null,
    cohortId: d.cohortId || null,
    centerId: d.centerId || null,
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

  // New expenses always start PENDING — payment status is only reached through
  // the approval workflow, never set directly on create.
  const expense = await prisma.expense.create({
    data: {
      ...expenseData(parsed.data),
      status: "PENDING",
      receiptUrl: sanitizeImageUrl((formData.get("receiptUrl") as string) ?? ""),
      districtId: districtFor(session, formData),
      createdById: session.user.id,
    },
  });
  await writeAudit(session.user.id, "create", "Expense", expense.id);

  revalidatePath(`/${locale}/admin/expenses`);
  redirect(withFlash(`/${locale}/admin/expenses`, "saved"));
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
    select: { districtId: true, status: true },
  });
  if (!existing) return { error: "notFound" };
  assertDistrict(session, existing.districtId); // branch admins: own district only

  // Only a pending expense can be edited — approved/paid/void records are locked
  // so the financial trail can't be rewritten after a decision is made.
  if (existing.status !== "PENDING") return { error: "locked" };

  const parsed = expenseInput.safeParse(expenseFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  // Note: receiptUrl is intentionally not touched here — there is no receipt
  // field on the edit form yet, so writing it would wipe any stored receipt.
  await prisma.expense.update({
    where: { id },
    data: {
      ...expenseData(parsed.data),
      districtId: districtFor(session, formData, existing.districtId),
    },
  });
  await writeAudit(session.user.id, "update", "Expense", id);

  revalidatePath(`/${locale}/admin/expenses`);
  redirect(withFlash(`/${locale}/admin/expenses`, "saved"));
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { districtId: true, status: true },
  });
  if (!existing) return;
  assertDistrict(session, existing.districtId);

  // Only pending expenses can be hard-deleted. Once in the workflow, records are
  // voided (kept with a reason), never erased.
  if (existing.status !== "PENDING") return;

  await prisma.expense.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Expense", id);

  revalidatePath(`/${locale}/admin/expenses`);
  redirect(withFlash(`/${locale}/admin/expenses`, "deleted"));
}

/** Approve a pending expense. Enforces separation of duties: the approver must
 *  not be the person who recorded it. */
export async function approveExpense(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission("expense.approve");
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const e = await prisma.expense.findUnique({
    where: { id },
    select: { districtId: true, status: true, createdById: true },
  });
  if (!e) return { error: "notFound" };
  assertDistrict(session, e.districtId);
  if (e.status !== "PENDING") return { error: "badState" };
  if (e.createdById && e.createdById === session.user.id) {
    return { error: "sameApprover" };
  }

  await prisma.expense.update({
    where: { id },
    data: { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date() },
  });
  await writeAudit(session.user.id, "update", "Expense", id, { transition: "approve" });

  revalidatePath(`/${locale}/admin/expenses`);
  redirect(withFlash(`/${locale}/admin/expenses`, "saved"));
}

/** Mark an approved expense as paid, recording payment details. Blocks payment
 *  that would overspend a restricted grant. */
export async function markPaidExpense(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission("expense.pay");
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const e = await prisma.expense.findUnique({
    where: { id },
    select: { districtId: true, status: true, amount: true, grantId: true },
  });
  if (!e) return { error: "notFound" };
  assertDistrict(session, e.districtId);
  if (e.status !== "APPROVED") return { error: "badState" };

  const parsed = payInput.safeParse(payFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  // Restricted-grant guard: a payment cannot push a restricted grant's committed
  // spend past the amount received.
  if (e.grantId) {
    const grant = await prisma.grant.findUnique({
      where: { id: e.grantId },
      select: { amount: true, restricted: true },
    });
    if (grant?.restricted) {
      const committed = await prisma.expense.aggregate({
        where: {
          grantId: e.grantId,
          status: { in: ["APPROVED", "PAID"] },
          id: { not: id },
        },
        _sum: { amount: true },
      });
      const already = committed._sum.amount ?? new Prisma.Decimal(0);
      if (already.plus(e.amount).greaterThan(grant.amount)) {
        return { error: "grantOverspent" };
      }
    }
  }

  await prisma.expense.update({
    where: { id },
    data: {
      status: "PAID",
      paidById: session.user.id,
      // The payment date the payer entered (defaults to today in the form).
      paidAt: parseDate(parsed.data.paidOn) ?? new Date(),
      paymentMethod: parsed.data.paymentMethod,
      paymentReference: parsed.data.paymentReference || null,
    },
  });
  await writeAudit(session.user.id, "update", "Expense", id, {
    transition: "pay",
    method: parsed.data.paymentMethod,
  });

  revalidatePath(`/${locale}/admin/expenses`);
  redirect(withFlash(`/${locale}/admin/expenses`, "saved"));
}

/** Void (reverse) an expense in any non-void state, keeping it with a reason. */
export async function voidExpense(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission("expense.pay");
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const e = await prisma.expense.findUnique({
    where: { id },
    select: { districtId: true, status: true },
  });
  if (!e) return { error: "notFound" };
  assertDistrict(session, e.districtId);
  if (e.status === "VOID") return { error: "badState" };

  const parsed = voidInput.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  await prisma.expense.update({
    where: { id },
    data: {
      status: "VOID",
      voidedById: session.user.id,
      voidedAt: new Date(),
      voidReason: parsed.data.reason,
    },
  });
  await writeAudit(session.user.id, "update", "Expense", id, {
    transition: "void",
    reason: parsed.data.reason,
  });

  revalidatePath(`/${locale}/admin/expenses`);
  redirect(withFlash(`/${locale}/admin/expenses`, "saved"));
}
