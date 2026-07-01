"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { parseProgramRef } from "@/lib/program-ref";
import { writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/forms";

const PERMISSION = "feedback.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

/** Record that a participant has completed a program (unlocks their feedback). */
export async function createCompletion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const scope = scopedDistrictId(session);

  const userId = ((formData.get("userId") as string) ?? "").trim();
  const ref = parseProgramRef(formData.get("programRef") as string);
  if (!userId) return { fieldErrors: { userId: "required" } };
  if (!ref) return { fieldErrors: { programRef: "required" } };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return { fieldErrors: { userId: "required" } };

  let programId: string | null = null;
  let futureProgramId: string | null = null;
  let districtId: string | null = scope; // branch admins tag with their district

  if (ref.kind === "future") {
    const fp = await prisma.futureProgram.findUnique({
      where: { id: ref.id },
      select: { id: true, districtId: true },
    });
    if (!fp) return { fieldErrors: { programRef: "required" } };
    assertDistrict(session, fp.districtId); // branch admin: only their district's
    futureProgramId = fp.id;
    districtId = fp.districtId;
  } else {
    const p = await prisma.program.findUnique({
      where: { id: ref.id },
      select: { id: true },
    });
    if (!p) return { fieldErrors: { programRef: "required" } };
    programId = p.id;
  }

  // Don't mark the same person for the same program twice.
  const existing = await prisma.completion.findFirst({
    where: { userId, programId, futureProgramId },
    select: { id: true },
  });
  if (existing) return { error: "duplicate" };

  const c = await prisma.completion.create({
    data: {
      userId,
      programId,
      futureProgramId,
      districtId,
      markedById: session.user.id,
    },
  });
  await writeAudit(session.user.id, "create", "Completion", c.id);

  revalidatePath(`/${locale}/admin/completions`);
  redirect(`/${locale}/admin/completions`);
}

export async function deleteCompletion(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  const c = await prisma.completion.findUnique({
    where: { id },
    select: { districtId: true },
  });
  if (!c) return;
  assertDistrict(session, c.districtId); // branch admins only their district

  await prisma.completion.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Completion", id);

  revalidatePath(`/${locale}/admin/completions`);
  redirect(`/${locale}/admin/completions`);
}
