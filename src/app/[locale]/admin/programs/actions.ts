"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { toLocalized, toLocalizedOrNull } from "@/lib/localized";
import { programInput, programFromForm, type ProgramInput } from "@/lib/validation/program";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const PERMISSION = "cohort.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

// Shared scalar fields. `description` is handled per-operation because a nullable
// Prisma Json column needs Prisma.DbNull (not plain null) to be cleared on update.
function baseData(d: ProgramInput) {
  return {
    name: toLocalized(d.nameEn, d.nameKn),
    category: d.category || null,
    durationWeeks: d.durationWeeks,
    status: d.status,
  };
}

export async function createProgram(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const parsed = programInput.safeParse(programFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const description = toLocalizedOrNull(d.descEn, d.descKn);

  const program = await prisma.program.create({
    data: { ...baseData(d), description: description ?? undefined },
  });
  await writeAudit(session.user.id, "create", "Program", program.id);

  revalidatePath(`/${locale}/admin/programs`);
  redirect(`/${locale}/admin/programs`);
}

export async function updateProgram(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = programInput.safeParse(programFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const description = toLocalizedOrNull(d.descEn, d.descKn);

  await prisma.program.update({
    where: { id },
    data: { ...baseData(d), description: description ?? Prisma.DbNull },
  });
  await writeAudit(session.user.id, "update", "Program", id);

  revalidatePath(`/${locale}/admin/programs`);
  redirect(`/${locale}/admin/programs`);
}

export async function deleteProgram(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.program.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Program", id);

  revalidatePath(`/${locale}/admin/programs`);
  redirect(`/${locale}/admin/programs`);
}
