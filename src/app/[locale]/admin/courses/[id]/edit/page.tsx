import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { DeleteButton } from "@/components/admin/delete-button";
import { CourseForm } from "../../course-form";
import { updateCourse, deleteCourse } from "../../actions";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("cohort.manage");

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) notFound();

  const programs = await prisma.program.findMany();
  const options = programs
    .map((p) => ({ id: p.id, name: localized(p.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const name = (course.name ?? {}) as { en?: string; kn?: string };
  const desc = (course.description ?? {}) as { en?: string; kn?: string };
  const t = await getTranslations("Courses");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <CourseForm
        locale={locale}
        programs={options}
        action={updateCourse}
        defaults={{
          id: course.id,
          programId: course.programId,
          nameEn: name.en ?? "",
          nameKn: name.kn ?? "",
          descEn: desc.en ?? "",
          descKn: desc.kn ?? "",
          sequence: course.sequence,
          hours: course.hours,
          moodleCourseId: course.moodleCourseId,
        }}
      />

      <div className="max-w-xl border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteCourse}
          id={course.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
