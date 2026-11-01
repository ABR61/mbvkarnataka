"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { toLocalized } from "@/lib/localized";
import { districtInput, districtFromForm } from "@/lib/validation/district";
import { zodFieldErrors, type FormState } from "@/lib/forms";
import { withFlash } from "@/lib/flash";

// Districts are seeded (the 31 Karnataka districts); only edit is exposed.
export async function updateDistrict(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requirePermission("center.manage");
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = districtInput.safeParse(districtFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  await prisma.district.update({
    where: { id },
    data: {
      name: toLocalized(d.nameEn, d.nameKn),
      code: d.code || null,
      state: d.state,
    },
  });
  await writeAudit(session.user.id, "update", "District", id);

  revalidatePath(`/${locale}/admin/districts`);
  redirect(withFlash(`/${locale}/admin/districts`, "saved"));
}
