"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const profileInput = z.object({
  phone: z.string().trim().optional().default(""),
  email: z.union([z.literal(""), z.email("invalid")]).optional().default(""),
  address: z.string().trim().optional().default(""),
});

/**
 * A trainee updates their own contact details. The Person is resolved from the
 * session — never from a client-supplied id — so a trainee can only edit
 * themselves. Identity fields (name/DOB/gender) remain staff-managed.
 */
export async function updateMyProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requireAuth(`/${locale}/sign-in`);

  const person = await prisma.person.findUnique({
    where: { userId: session.user.id },
  });
  if (!person) return { error: "noProfile" };

  const parsed = profileInput.safeParse({
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  await prisma.person.update({
    where: { id: person.id },
    data: {
      phone: d.phone || null,
      email: d.email || null,
      address: d.address || null,
    },
  });
  await writeAudit(session.user.id, "update", "Person", person.id, {
    selfEdit: true,
  });

  revalidatePath(`/${locale}/portal/profile`);
  return { ok: true };
}
