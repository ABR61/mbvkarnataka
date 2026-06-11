"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { vendorInput } from "@/lib/validation/expense";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const PERMISSION = "finance.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function parse(formData: FormData) {
  return vendorInput.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    note: formData.get("note") ?? "",
  });
}

function data(d: ReturnType<typeof vendorInput.parse>) {
  return {
    name: d.name,
    contactPerson: d.contactPerson || null,
    phone: d.phone || null,
    email: d.email || null,
    note: d.note || null,
  };
}

export async function createVendor(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const vendor = await prisma.vendor.create({ data: data(parsed.data) });
  await writeAudit(session.user.id, "create", "Vendor", vendor.id);

  revalidatePath(`/${locale}/admin/vendors`);
  redirect(`/${locale}/admin/vendors`);
}

export async function updateVendor(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  await prisma.vendor.update({ where: { id }, data: data(parsed.data) });
  await writeAudit(session.user.id, "update", "Vendor", id);

  revalidatePath(`/${locale}/admin/vendors`);
  redirect(`/${locale}/admin/vendors`);
}

export async function deleteVendor(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.vendor.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Vendor", id);

  revalidatePath(`/${locale}/admin/vendors`);
  redirect(`/${locale}/admin/vendors`);
}
