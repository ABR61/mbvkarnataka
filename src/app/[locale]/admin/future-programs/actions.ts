"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { writeAudit } from "@/lib/audit";
import { sanitizeImageUrl } from "@/lib/storage";
import type { FormState } from "@/lib/forms";
import { withFlash } from "@/lib/flash";

const PERMISSION = "program.plan" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  const n = Number.parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function createFutureProgram(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const title = ((formData.get("title") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  if (!title) return { fieldErrors: { title: "required" } };
  if (!description) return { fieldErrors: { description: "required" } };

  // Branch admins plan for their own district; a super admin picks one.
  const scope = scopedDistrictId(session);
  let districtId = scope;
  if (!districtId) {
    const chosen = ((formData.get("districtId") as string) ?? "").trim();
    const d = chosen
      ? await prisma.district.findUnique({ where: { id: chosen }, select: { id: true } })
      : null;
    if (!d) return { fieldErrors: { districtId: "required" } };
    districtId = d.id;
  }

  const imageUrl = sanitizeImageUrl((formData.get("imageUrl") as string) ?? "");

  const fp = await prisma.futureProgram.create({
    data: {
      title,
      description,
      imageUrl,
      objectives: ((formData.get("objectives") as string) ?? "").trim() || null,
      resources: ((formData.get("resources") as string) ?? "").trim() || null,
      durationWeeks: intOrNull(formData.get("durationWeeks")),
      durationUnit: (() => {
        const u = String(formData.get("durationUnit") ?? "");
        return ["days", "weeks", "months"].includes(u) ? u : null;
      })(),
      seats: intOrNull(formData.get("seats")),
      approved: scope === null, // super admin's own posts publish immediately
      districtId,
      authorId: session.user.id,
    },
  });
  await writeAudit(session.user.id, "create", "FutureProgram", fp.id);

  revalidatePath(`/${locale}/admin/future-programs`);
  revalidatePath(`/${locale}/future-programs`);
  redirect(withFlash(`/${locale}/admin/future-programs`, "saved"));
}

/** Approve/unapprove — super admin (no district scope) only. */
export async function setFutureProgramApproval(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  if (scopedDistrictId(session) !== null) {
    const { forbidden } = await import("next/navigation");
    forbidden();
  }
  const id = formData.get("id") as string;
  const approved = formData.get("approved") === "true";
  if (!id) return;

  await prisma.futureProgram.update({ where: { id }, data: { approved } });
  await writeAudit(session.user.id, "update", "FutureProgram", id, { approved });

  revalidatePath(`/${locale}/admin/future-programs`);
  revalidatePath(`/${locale}/future-programs`);
  redirect(withFlash(`/${locale}/admin/future-programs`, "saved"));
}

export async function deleteFutureProgram(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  const fp = await prisma.futureProgram.findUnique({
    where: { id },
    select: { districtId: true },
  });
  if (!fp) return;
  assertDistrict(session, fp.districtId); // branch admins only their district

  await prisma.futureProgram.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "FutureProgram", id);

  revalidatePath(`/${locale}/admin/future-programs`);
  revalidatePath(`/${locale}/future-programs`);
  redirect(withFlash(`/${locale}/admin/future-programs`, "deleted"));
}
