"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { userCreateInput, userUpdateInput } from "@/lib/validation/user";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const PERMISSION = "user.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

/** Validate submitted role ids against the roles that actually exist. */
async function validRoleIds(formData: FormData): Promise<string[]> {
  const submitted = formData.getAll("roles").map(String);
  if (submitted.length === 0) return [];
  const roles = await prisma.role.findMany({ select: { id: true } });
  const known = new Set(roles.map((r) => r.id));
  return submitted.filter((id) => known.has(id));
}

export async function createUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const parsed = userCreateInput.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    locale: formData.get("userLocale") || "en",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) return { fieldErrors: { email: "taken" } };

  const roleIds = await validRoleIds(formData);
  const passwordHash = await bcrypt.hash(d.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: d.email, name: d.name, passwordHash, locale: d.locale },
    });
    if (roleIds.length) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: created.id, roleId })),
      });
    }
    return created;
  });
  await writeAudit(session.user.id, "create", "User", user.id);

  revalidatePath(`/${locale}/admin/users`);
  redirect(`/${locale}/admin/users`);
}

export async function updateUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = userUpdateInput.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    locale: formData.get("userLocale") || "en",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const roleIds = await validRoleIds(formData);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { name: d.name, status: d.status, locale: d.locale },
    });
    await tx.userRole.deleteMany({ where: { userId: id } });
    if (roleIds.length) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }
  });
  await writeAudit(session.user.id, "update", "User", id, { status: d.status });

  revalidatePath(`/${locale}/admin/users`);
  redirect(`/${locale}/admin/users`);
}

export async function resetUserPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = z
    .object({ password: z.string().min(8, "min8") })
    .safeParse({ password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await writeAudit(session.user.id, "update", "User", id, { passwordReset: true });

  revalidatePath(`/${locale}/admin/users/${id}/edit`);
  return { ok: true };
}

export async function deleteUser(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id || id === session.user.id) return; // never delete yourself

  await prisma.user.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "User", id);

  revalidatePath(`/${locale}/admin/users`);
  redirect(`/${locale}/admin/users`);
}
