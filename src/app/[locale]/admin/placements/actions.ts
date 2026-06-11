"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { parseDate } from "@/lib/validation/cohort";
import { placementInput } from "@/lib/validation/placement";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const PERMISSION = "placement.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function parse(formData: FormData) {
  return placementInput.safeParse({
    personId: formData.get("personId"),
    employerId: formData.get("employerId"),
    jobTitle: formData.get("jobTitle") ?? "",
    employmentType: formData.get("employmentType") ?? "",
    monthlySalary: formData.get("monthlySalary") ?? "",
    placedOn: formData.get("placedOn"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });
}

function data(d: ReturnType<typeof placementInput.parse>) {
  return {
    personId: d.personId,
    employerId: d.employerId,
    jobTitle: d.jobTitle || null,
    employmentType: d.employmentType || null,
    monthlySalary: d.monthlySalary || null,
    placedOn: parseDate(d.placedOn) ?? new Date(),
    status: d.status,
    note: d.note || null,
  };
}

export async function createPlacement(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const placement = await prisma.placement.create({
    data: { ...data(parsed.data), createdById: session.user.id },
  });
  await writeAudit(session.user.id, "create", "Placement", placement.id);

  revalidatePath(`/${locale}/admin/placements`);
  redirect(`/${locale}/admin/placements`);
}

export async function updatePlacement(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  await prisma.placement.update({ where: { id }, data: data(parsed.data) });
  await writeAudit(session.user.id, "update", "Placement", id);

  revalidatePath(`/${locale}/admin/placements`);
  redirect(`/${locale}/admin/placements`);
}

export async function deletePlacement(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.placement.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Placement", id);

  revalidatePath(`/${locale}/admin/placements`);
  redirect(`/${locale}/admin/placements`);
}
