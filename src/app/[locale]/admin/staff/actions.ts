"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/forms";

const PERMISSION = "staff.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

/** Add a staff member (Person of kind STAFF). Branch admins add to their district. */
export async function createStaff(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const scope = scopedDistrictId(session);

  const firstName = ((formData.get("firstName") as string) ?? "").trim();
  const lastName = ((formData.get("lastName") as string) ?? "").trim();
  const phone = ((formData.get("phone") as string) ?? "").trim();
  const role = ((formData.get("role") as string) ?? "").trim();
  if (!firstName) return { fieldErrors: { firstName: "required" } };

  // Branch admins are pinned to their district; a super admin may pick one.
  let districtId = scope;
  if (!districtId) {
    const chosen = ((formData.get("districtId") as string) ?? "").trim();
    districtId = chosen || null;
  }

  const person = await prisma.person.create({
    data: {
      kind: "STAFF",
      firstName,
      lastName: lastName || null,
      phone: phone || null,
      address: role || null, // store designation/role in the address field for now
      districtId,
    },
  });
  await writeAudit(session.user.id, "create", "Person", person.id, { staff: true });

  revalidatePath(`/${locale}/admin/staff`);
  redirect(`/${locale}/admin/staff`);
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  const person = await prisma.person.findUnique({
    where: { id },
    select: { districtId: true, kind: true },
  });
  if (!person || (person.kind !== "STAFF" && person.kind !== "TRAINER")) return;
  assertDistrict(session, person.districtId);

  await prisma.person.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Person", id, { staff: true });

  revalidatePath(`/${locale}/admin/staff`);
  redirect(`/${locale}/admin/staff`);
}
