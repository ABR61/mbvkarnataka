"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { toLocalized, toLocalizedOrNull } from "@/lib/localized";
import { courseInput, courseFromForm, type CourseInput } from "@/lib/validation/course";
import { zodFieldErrors, type FormState } from "@/lib/forms";

const PERMISSION = "cohort.manage" as const;

function localeOf(formData: FormData): string {
  return (formData.get("locale") as string) || "en";
}

function baseData(d: CourseInput) {
  return {
    programId: d.programId,
    name: toLocalized(d.nameEn, d.nameKn),
    sequence: d.sequence,
    hours: d.hours,
    moodleCourseId: d.moodleCourseId,
  };
}

export async function createCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);

  const parsed = courseInput.safeParse(courseFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const description = toLocalizedOrNull(d.descEn, d.descKn);

  const course = await prisma.course.create({
    data: { ...baseData(d), description: description ?? undefined },
  });
  await writeAudit(session.user.id, "create", "Course", course.id);

  revalidatePath(`/${locale}/admin/courses`);
  redirect(`/${locale}/admin/courses`);
}

export async function updateCourse(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return { error: "notFound" };

  const parsed = courseInput.safeParse(courseFromForm(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const description = toLocalizedOrNull(d.descEn, d.descKn);

  await prisma.course.update({
    where: { id },
    data: { ...baseData(d), description: description ?? Prisma.DbNull },
  });
  await writeAudit(session.user.id, "update", "Course", id);

  revalidatePath(`/${locale}/admin/courses`);
  redirect(`/${locale}/admin/courses`);
}

export async function deleteCourse(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const session = await requirePermission(PERMISSION);
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.course.delete({ where: { id } });
  await writeAudit(session.user.id, "delete", "Course", id);

  revalidatePath(`/${locale}/admin/courses`);
  redirect(`/${locale}/admin/courses`);
}
