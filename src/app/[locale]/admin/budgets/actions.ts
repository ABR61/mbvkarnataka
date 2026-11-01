"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { budgetInput } from "@/lib/validation/expense";
import { zodFieldErrors, type FormState } from "@/lib/forms";
import { withFlash } from "@/lib/flash";

/** Set (upsert) a program's budget. */
export async function setBudget(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requirePermission("finance.manage");

  const parsed = budgetInput.safeParse({
    programId: formData.get("programId"),
    amount: formData.get("amount"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  await prisma.budget.upsert({
    where: { programId: d.programId },
    update: { amount: d.amount, note: d.note || null },
    create: { programId: d.programId, amount: d.amount, note: d.note || null },
  });
  await writeAudit(session.user.id, "update", "Budget", d.programId);

  revalidatePath(`/${locale}/admin/budgets`);
  redirect(withFlash(`/${locale}/admin/budgets`, "saved"));
}
