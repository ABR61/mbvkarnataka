"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { venueInput, venueFromForm } from "@/lib/validation/venue";
import { zodFieldErrors, type FormState } from "@/lib/forms";
import { withFlash } from "@/lib/flash";

const PERMISSION = "center.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

export async function createVenue(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const parsed = venueInput.safeParse(venueFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const venue = await prisma.venue.create({
    data: { name: d.name, centerId: d.centerId, capacity: d.capacity },
  });
  await writeAudit(session.user.id, "create", "Venue", venue.id);

  revalidatePath(`/${locale}/admin/venues`);
  redirect(withFlash(`/${locale}/admin/venues`, "saved"));
}

export async function updateVenue(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = venueInput.safeParse(venueFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  await prisma.venue.update({
    where: { id },
    data: { name: d.name, centerId: d.centerId, capacity: d.capacity },
  });
  await writeAudit(session.user.id, "update", "Venue", id);

  revalidatePath(`/${locale}/admin/venues`);
  redirect(withFlash(`/${locale}/admin/venues`, "saved"));
}

export async function deleteVenue(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.venue.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Venue", id);

  revalidatePath(`/${locale}/admin/venues`);
  redirect(withFlash(`/${locale}/admin/venues`, "deleted"));
}
