"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { zodFieldErrors, type FormState } from "@/lib/forms";
import { isAttendanceStatus } from "@/lib/validation/session";

const profileInput = z.object({
  phone: z.string().trim().optional().default(""),
  email: z.union([z.literal(""), z.email("invalid")]).optional().default(""),
  address: z.string().trim().optional().default(""),
});

/**
 * A trainee updates their own contact details. The Person is resolved from the
 * session — never from a client-supplied id — so a trainee can only edit
 * themselves. Identity fields (name/DOB/gender) remain staff-managed.
 */
export async function updateMyProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requireAuth(`/${locale}/sign-in`);

  const person = await prisma.person.findUnique({
    where: { userId: session.user.id },
  });
  if (!person) return { error: "noProfile" };

  const parsed = profileInput.safeParse({
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  await prisma.person.update({
    where: { id: person.id },
    data: {
      phone: d.phone || null,
      email: d.email || null,
      address: d.address || null,
    },
  });
  await writeAudit(session.user.id, "update", "Person", person.id, {
    selfEdit: true,
  });

  revalidatePath(`/${locale}/portal/profile`);
  return { ok: true };
}

/**
 * A trainee reports a mistake in their own attendance for a marked session.
 * Creates a correction request that a reviewer approves or rejects — the
 * trainee can't change the record themselves.
 */
export async function reportAttendanceIssue(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requireAuth();
  const sessionId = (formData.get("sessionId") as string) ?? "";
  const toStatus = formData.get("toStatus");
  const reason = ((formData.get("reason") as string) ?? "").trim();
  if (!sessionId || !isAttendanceStatus(toStatus)) return { error: "invalid" };
  if (reason.length < 5) return { fieldErrors: { reason: "required" } };

  const person = await prisma.person.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!person) return { error: "invalid" };

  // Only sessions of a cohort they're enrolled in, and only once marked.
  const ts = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { cohortId: true },
  });
  if (!ts) return { error: "invalid" };
  const enrolled = await prisma.enrollment.findFirst({
    where: { cohortId: ts.cohortId, personId: person.id },
    select: { id: true },
  });
  if (!enrolled) return { error: "invalid" };
  const current = await prisma.attendance.findUnique({
    where: { sessionId_personId: { sessionId, personId: person.id } },
    select: { status: true },
  });
  if (!current) return { error: "notMarked" };
  if (current.status === toStatus) return { error: "noChange" };

  const pending = await prisma.attendanceCorrection.findFirst({
    where: { sessionId, personId: person.id, status: "PENDING" },
    select: { id: true },
  });
  if (pending) return { error: "duplicate" };

  const c = await prisma.attendanceCorrection.create({
    data: {
      sessionId,
      personId: person.id,
      fromStatus: current.status,
      toStatus,
      reason,
      source: "TRAINEE",
      requestedById: session.user.id,
    },
  });
  await writeAudit(session.user.id, "create", "AttendanceCorrection", c.id, { sessionId, source: "TRAINEE" });

  revalidatePath(`/${locale}/portal`);
  return { ok: true };
}
