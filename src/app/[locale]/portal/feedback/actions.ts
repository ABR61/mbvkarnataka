"use server";

import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import { issueCompletionCertificate } from "@/lib/issue-certificate";
import { writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/forms";

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

/**
 * A completer submits (or revises) feedback for a program they finished.
 * The completion must belong to the signed-in user; submitting resets the
 * feedback to pending so a super admin re-approves before it shows publicly.
 */
export async function submitFeedback(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requireAuth();

  const completionId = ((formData.get("completionId") as string) ?? "").trim();
  const rating = Number.parseInt(String(formData.get("rating") ?? ""), 10);
  const comment = ((formData.get("comment") as string) ?? "").trim();

  if (!completionId) return { error: "invalid" };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { fieldErrors: { rating: "required" } };
  }

  const completion = await prisma.completion.findUnique({
    where: { id: completionId },
    select: { userId: true },
  });
  if (!completion) return { error: "invalid" };
  if (completion.userId !== session.user.id) forbidden(); // not your completion

  await prisma.feedback.upsert({
    where: { completionId },
    create: { completionId, rating, comment: comment || null, approved: false },
    update: { rating, comment: comment || null, approved: false },
  });
  await writeAudit(session.user.id, "update", "Feedback", completionId);

  // Leaving feedback earns the participant their certificate immediately
  // (idempotent — re-submitting feedback won't issue a second one).
  await issueCompletionCertificate(completionId, session.user.id);

  revalidatePath(`/${locale}/portal/feedback`);
  revalidatePath(`/${locale}/portal`);
  return { ok: true };
}
