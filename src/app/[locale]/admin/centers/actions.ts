"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { toLocalized } from "@/lib/localized";
import { centerInput, centerFromForm } from "@/lib/validation/center";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const PERMISSION = "center.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

export async function createCenter(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const parsed = centerInput.safeParse(centerFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const center = await prisma.center.create({
    data: {
      name: toLocalized(d.nameEn, d.nameKn),
      districtId: d.districtId,
      address: d.address || null,
      contactPhone: d.contactPhone || null,
      status: d.status,
    },
  });
  await writeAudit(session.user.id, "create", "Center", center.id);

  revalidatePath(`/${locale}/admin/centers`);
  redirect(`/${locale}/admin/centers`);
}

export async function updateCenter(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = centerInput.safeParse(centerFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  await prisma.center.update({
    where: { id },
    data: {
      name: toLocalized(d.nameEn, d.nameKn),
      districtId: d.districtId,
      address: d.address || null,
      contactPhone: d.contactPhone || null,
      status: d.status,
    },
  });
  await writeAudit(session.user.id, "update", "Center", id);

  revalidatePath(`/${locale}/admin/centers`);
  redirect(`/${locale}/admin/centers`);
}

export async function deleteCenter(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.center.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Center", id);

  revalidatePath(`/${locale}/admin/centers`);
  redirect(`/${locale}/admin/centers`);
}
