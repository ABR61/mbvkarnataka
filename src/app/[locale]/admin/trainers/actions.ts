"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import {
  trainerCreateInput,
  trainerUpdateInput,
  personFromForm,
  personScalars,
  parseDateOfBirth,
} from "@/lib/validation/person";
import { zodFieldErrors, type FormState } from "@/lib/forms";
import { withFlash } from "@/lib/flash";

const PERMISSION = "trainer.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function fullName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(" ");
}

export async function createTrainer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const parsed = trainerCreateInput.safeParse(personFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const { date: dateOfBirth, error: dobError } = parseDateOfBirth(d.dateOfBirth);
  if (dobError) return { fieldErrors: { dateOfBirth: dobError } };

  // Email must be free to serve as the login.
  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) return { fieldErrors: { email: "taken" } };

  const trainerRole = await prisma.role.findUnique({ where: { name: "Trainer" } });
  const passwordHash = await bcrypt.hash(d.password, 10);

  // Provision login + Trainer role + person atomically.
  const person = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: d.email, name: fullName(d.firstName, d.lastName), passwordHash, locale },
    });
    if (trainerRole) {
      await tx.userRole.create({ data: { userId: user.id, roleId: trainerRole.id } });
    }
    return tx.person.create({
      data: { kind: "TRAINER", userId: user.id, ...personScalars(d, dateOfBirth) },
    });
  });
  await writeAudit(session.user.id, "create", "Person", person.id, {
    kind: "TRAINER",
    userId: person.userId,
  });

  revalidatePath(`/${locale}/admin/trainers`);
  redirect(withFlash(`/${locale}/admin/trainers`, "saved"));
}

export async function updateTrainer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = trainerUpdateInput.safeParse(personFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const { date: dateOfBirth, error: dobError } = parseDateOfBirth(d.dateOfBirth);
  if (dobError) return { fieldErrors: { dateOfBirth: dobError } };

  const existing = await prisma.person.findUnique({
    where: { id },
    select: { userId: true },
  });
  await prisma.person.update({
    where: { id },
    data: personScalars(d, dateOfBirth),
  });
  // Keep the linked login's display name in sync (email is read-only in the form).
  if (existing?.userId) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { name: fullName(d.firstName, d.lastName) },
    });
  }
  await writeAudit(session.user.id, "update", "Person", id, { kind: "TRAINER" });

  revalidatePath(`/${locale}/admin/trainers`);
  redirect(withFlash(`/${locale}/admin/trainers`, "saved"));
}

export async function deleteTrainer(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  const existing = await prisma.person.findUnique({
    where: { id },
    select: { userId: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.person.delete({ where: { id } });
    if (existing?.userId) await tx.user.delete({ where: { id: existing.userId } });
  });
  await writeAudit(session.user.id, "delete", "Person", id, { kind: "TRAINER" });

  revalidatePath(`/${locale}/admin/trainers`);
  redirect(withFlash(`/${locale}/admin/trainers`, "deleted"));
}
