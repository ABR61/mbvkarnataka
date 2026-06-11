"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import {
  traineeInput,
  personFromForm,
  personScalars,
  parseDateOfBirth,
} from "@/lib/validation/person";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const loginSchema = z.object({
  email: z.email("invalid"),
  password: z.string().min(8, "min8"),
});

const PERMISSION = "trainee.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function createTrainee(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const parsed = traineeInput.safeParse(personFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const { date: dateOfBirth, error: dobError } = parseDateOfBirth(
    parsed.data.dateOfBirth,
  );
  if (dobError) return { fieldErrors: { dateOfBirth: dobError } };

  // DPDP: explicit consent is required to create a trainee record.
  if (formData.get("consent") !== "on") {
    return { fieldErrors: { consent: "required" } };
  }

  const person = await prisma.person.create({
    data: { kind: "TRAINEE", ...personScalars(parsed.data, dateOfBirth) },
  });
  await prisma.consentRecord.create({
    data: {
      personId: person.id,
      consentType: "data_processing",
      version: "v1",
      ipAddress: await clientIp(),
    },
  });
  await writeAudit(session.user.id, "create", "Person", person.id, {
    kind: "TRAINEE",
  });

  revalidatePath(`/${locale}/admin/trainees`);
  redirect(`/${locale}/admin/trainees`);
}

export async function updateTrainee(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = traineeInput.safeParse(personFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const { date: dateOfBirth, error: dobError } = parseDateOfBirth(
    parsed.data.dateOfBirth,
  );
  if (dobError) return { fieldErrors: { dateOfBirth: dobError } };

  await prisma.person.update({
    where: { id },
    data: personScalars(parsed.data, dateOfBirth),
  });
  await writeAudit(session.user.id, "update", "Person", id, { kind: "TRAINEE" });

  revalidatePath(`/${locale}/admin/trainees`);
  redirect(`/${locale}/admin/trainees`);
}

export async function deleteTrainee(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.person.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Person", id, { kind: "TRAINEE" });

  revalidatePath(`/${locale}/admin/trainees`);
  redirect(`/${locale}/admin/trainees`);
}

/**
 * Provision a portal login for an existing trainee: creates a User with the
 * Trainee role and links it to the Person. Lets the trainee sign in to the
 * self-service portal.
 */
export async function createTraineeLogin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const personId = formData.get("id") as string;
  if (!personId) return { error: "notFound" };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const { email, password } = parsed.data;

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person || person.kind !== "TRAINEE") return { error: "notFound" };
  if (person.userId) return { error: "hasLogin" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { fieldErrors: { email: "taken" } };

  const traineeRole = await prisma.role.findUnique({ where: { name: "Trainee" } });
  const passwordHash = await bcrypt.hash(password, 10);
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ");

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, passwordHash, locale },
    });
    if (traineeRole) {
      await tx.userRole.create({ data: { userId: user.id, roleId: traineeRole.id } });
    }
    await tx.person.update({
      where: { id: personId },
      data: { userId: user.id, email: person.email ?? email },
    });
  });
  await writeAudit(session.user.id, "create", "User", personId, {
    portalLogin: true,
  });

  revalidatePath(`/${locale}/admin/trainees/${personId}/edit`);
  return { ok: true };
}
