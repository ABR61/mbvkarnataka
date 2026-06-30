"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { writeAudit } from "@/lib/audit";
import type { FormState } from "@/lib/forms";

const PERMISSION = "post.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

export async function createPost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const title = ((formData.get("title") as string) ?? "").trim();
  const body = ((formData.get("body") as string) ?? "").trim();
  if (!title) return { fieldErrors: { title: "required" } };
  if (!body) return { fieldErrors: { body: "required" } };

  // Optional inline photo: only accept a reasonably-sized image data URL.
  const rawImage = ((formData.get("imageUrl") as string) ?? "").trim();
  const imageUrl =
    rawImage.startsWith("data:image/") && rawImage.length < 2_200_000
      ? rawImage
      : null;

  // Branch admins post to their own district; a super admin picks one.
  const scope = scopedDistrictId(session);
  let districtId = scope;
  if (!districtId) {
    const chosen = ((formData.get("districtId") as string) ?? "").trim();
    const district = chosen
      ? await prisma.district.findUnique({
          where: { id: chosen },
          select: { id: true },
        })
      : null;
    if (!district) return { fieldErrors: { districtId: "required" } };
    districtId = district.id;
  }

  // Super admins (no district scope) publish immediately; branch admins'
  // posts stay pending until a super admin approves them.
  const approved = scope === null;
  const post = await prisma.post.create({
    data: {
      title,
      body,
      imageUrl,
      approved,
      districtId,
      authorId: session.user.id,
    },
  });
  await writeAudit(session.user.id, "create", "Post", post.id);

  revalidatePath(`/${locale}/admin/posts`);
  revalidatePath(`/${locale}`);
  redirect(`/${locale}/admin/posts`);
}

/** Approve or unapprove a post — super admin (no district scope) only. */
export async function setPostApproval(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  // Only the super admin controls what goes public.
  if (scopedDistrictId(session) !== null) {
    const { forbidden } = await import("next/navigation");
    forbidden();
  }
  const id = formData.get("id") as string;
  const approved = formData.get("approved") === "true";
  if (!id) return;

  await prisma.post.update({ where: { id }, data: { approved } });
  await writeAudit(session.user.id, "update", "Post", id, { approved });

  revalidatePath(`/${locale}/admin/posts`);
  revalidatePath(`/${locale}`);
  redirect(`/${locale}/admin/posts`);
}

export async function deletePost(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  // Branch admins may only delete their own district's posts.
  const post = await prisma.post.findUnique({
    where: { id },
    select: { districtId: true },
  });
  if (!post) return;
  assertDistrict(session, post.districtId);

  await prisma.post.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Post", id);

  revalidatePath(`/${locale}/admin/posts`);
  revalidatePath(`/${locale}`);
  redirect(`/${locale}/admin/posts`);
}
