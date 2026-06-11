"use server";

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
