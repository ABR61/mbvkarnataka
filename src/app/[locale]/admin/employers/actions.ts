"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { employerInput } from "@/lib/validation/placement";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const PERMISSION = "placement.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function parse(formData: FormData) {
  return employerInput.safeParse({
    name: formData.get("name"),
    sector: formData.get("sector") ?? "",
    contactPerson: formData.get("contactPerson") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    districtId: formData.get("districtId") ?? "",
    note: formData.get("note") ?? "",
  });
}

function data(d: ReturnType<typeof employerInput.parse>) {
  return {
    name: d.name,
    sector: d.sector || null,
    contactPerson: d.contactPerson || null,
    phone: d.phone || null,
    email: d.email || null,
    districtId: d.districtId || null,
    note: d.note || null,
  };
}

export async function createEmployer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const employer = await prisma.employer.create({ data: data(parsed.data) });
  await writeAudit(session.user.id, "create", "Employer", employer.id);

  revalidatePath(`/${locale}/admin/employers`);
  redirect(`/${locale}/admin/employers`);
}

export async function updateEmployer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  await prisma.employer.update({ where: { id }, data: data(parsed.data) });
  await writeAudit(session.user.id, "update", "Employer", id);

  revalidatePath(`/${locale}/admin/employers`);
  redirect(`/${locale}/admin/employers`);
}

export async function deleteEmployer(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.employer.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Employer", id);

  revalidatePath(`/${locale}/admin/employers`);
  redirect(`/${locale}/admin/employers`);
}
