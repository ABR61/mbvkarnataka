import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { CourseForm } from "../course-form";
import { createCourse } from "../actions";

export default async function NewCoursePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("cohort.manage");

  const programs = await prisma.program.findMany();
  const options = programs
    .map((p) => ({ id: p.id, name: localized(p.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const t = await getTranslations("Courses");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <CourseForm locale={locale} programs={options} action={createCourse} />
    </div>
  );
}
