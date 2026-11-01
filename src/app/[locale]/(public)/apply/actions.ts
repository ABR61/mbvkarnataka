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
import { consumeRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import { getClientIp } from "@/lib/client-ip";

export type ApplyState = FormState & {
  ok?: boolean;
  /** What the applicant typed, echoed back on error so the form can refill
   *  itself (React resets a form after its action runs). Excludes the photo. */
  values?: Record<string, string>;
};

const ECHO_FIELDS = [
  "firstName", "lastName", "phone", "email", "gender", "dateOfBirth",
  "aadhaarNumber", "districtId", "programId", "message", "consent",
] as const;

function echo(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ECHO_FIELDS) {
    const v = formData.get(k);
    if (typeof v === "string" && v) out[k] = v;
  }
  return out;
}

/**
 * Public, unauthenticated application submission. Defenses: a hidden honeypot
 * field, zod validation, required DPDP consent, and per-IP rate limiting.
 */
export async function createApplication(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  // Honeypot: real users never fill this; bots do. Pretend success, write nothing.
  if (((formData.get("website") as string) ?? "").trim()) return { ok: true };

  // Per-IP throttle so the public form can't be flooded with spam submissions.
  const ip = getClientIp(await headers());
  const gate = await consumeRateLimit({
    bucket: "apply",
    key: ip,
    limit: RATE_LIMITS.apply.limit,
    windowSec: RATE_LIMITS.apply.windowSec,
  });
  if (!gate.ok) return { error: "rate_limited", values: echo(formData) };

  const parsed = applicationInput.safeParse(applicationFromForm(formData));
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error), values: echo(formData) };
  }
  const d = parsed.data;

  // Applicant photo, captured live on the camera — OPTIONAL for now (so it can
  // be submitted from a laptop without a camera). Stored if provided; to make it
  // mandatory again, re-add: if (!photoUrl) return { fieldErrors: { photoUrl: "required" } };
  const rawPhoto = ((formData.get("photoUrl") as string) ?? "").trim();
  const photoUrl =
    rawPhoto.startsWith("data:image/") && rawPhoto.length < 2_200_000
      ? rawPhoto
      : null;

  if (formData.get("consent") !== "on") {
    return { fieldErrors: { consent: "required" }, values: echo(formData) };
  }

  const dob = parseDateOfBirth(d.dateOfBirth);
  if (dob.error) {
    return { fieldErrors: { dateOfBirth: dob.error }, values: echo(formData) };
  }

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
