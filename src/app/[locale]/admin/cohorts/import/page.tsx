import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { ImportForm } from "@/components/admin/import-form";
import { importEnrollments } from "./actions";

export default async function ImportEnrollmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("cohort.manage");

  const t = await getTranslations("Import");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("enrollmentsTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("enrollmentsIntro")}</p>
      </div>
      <ImportForm
        locale={locale}
        action={importEnrollments}
        templateHref="/templates/enrollments-import.csv"
        columnsHint="cohortCode, traineePhone"
      />
    </div>
  );
}
