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

  // Applicant photo, captured on their phone — required, image data URL, ~2MB cap.
  const rawPhoto = ((formData.get("photoUrl") as string) ?? "").trim();
  const photoUrl =
    rawPhoto.startsWith("data:image/") && rawPhoto.length < 2_200_000
      ? rawPhoto
      : null;
  if (!photoUrl) return { fieldErrors: { photoUrl: "required" } };

  if (formData.get("consent") !== "on") {
    return { fieldErrors: { consent: "required" } };
  }

  const dob = parseDateOfBirth(d.dateOfBirth);
  if (dob.error) return { fieldErrors: { dateOfBirth: dob.error } };

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  // Applying to an announced future program: verify it and inherit its district
  // so the branch admin who posted it sees the applicant in their pipeline.
  let futureProgramId: string | null = null;
  let districtFromFuture: string | null = null;
  if (d.futureProgramId) {
    const fp = await prisma.futureProgram.findUnique({
      where: { id: d.futureProgramId },
      select: { id: true, districtId: true, approved: true },
    });
    if (fp?.approved) {
      futureProgramId = fp.id;
      districtFromFuture = fp.districtId;
    }
  }

  const application = await prisma.application.create({
    data: {
      firstName: d.firstName,
      lastName: d.lastName || null,
      phone: d.phone,
      email: d.email || null,
      gender: d.gender ? (d.gender as Gender) : null,
      dateOfBirth: dob.date,
      districtId: districtFromFuture ?? d.districtId ?? null,
      programId: d.programId || null,
      futureProgramId,
      aadhaarNumber: d.aadhaarNumber,
      photoUrl,
      message: d.message || null,
      consentAt: new Date(),
      ipAddress: ip,
    },
  });
  await writeAudit(undefined, "create", "Application", application.id);

  return { ok: true };
}
