"use server";

import type { Gender } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import {
  applicationInput,
  applicationFromForm,
} from "@/lib/validation/application";
import { parseDateOfBirth } from "@/lib/validation/person";
import { zodFieldErrors, type FormState } from "@/lib/forms";

export type ApplyState = FormState & { ok?: boolean };

/**
 * Public, unauthenticated application submission. Defenses: a hidden honeypot
 * field, zod validation, required DPDP consent. (Rate-limiting is a future add.)
 */
export async function createApplication(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  // Honeypot: real users never fill this; bots do. Pretend success, write nothing.
  if (((formData.get("website") as string) ?? "").trim()) return { ok: true };

  const parsed = applicationInput.safeParse(applicationFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  if (formData.get("consent") !== "on") {
    return { fieldErrors: { consent: "required" } };
  }

  const dob = parseDateOfBirth(d.dateOfBirth);
  if (dob.error) return { fieldErrors: { dateOfBirth: dob.error } };

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  const application = await prisma.application.create({
    data: {
      firstName: d.firstName,
      lastName: d.lastName || null,
      phone: d.phone,
      email: d.email || null,
      gender: d.gender ? (d.gender as Gender) : null,
      dateOfBirth: dob.date,
      districtId: d.districtId || null,
      programId: d.programId || null,
      message: d.message || null,
      consentAt: new Date(),
      ipAddress: ip,
    },
  });
  await writeAudit(undefined, "create", "Application", application.id);

  return { ok: true };
}
