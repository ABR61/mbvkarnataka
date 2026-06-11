import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { ImportForm } from "@/components/admin/import-form";
import { importTrainees } from "./actions";

export default async function ImportTraineesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("trainee.manage");

  const t = await getTranslations("Import");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("traineesTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("traineesIntro")}</p>
      </div>
      <ImportForm
        locale={locale}
        action={importTrainees}
        templateHref="/templates/trainees-import.csv"
        columnsHint="firstName, lastName, gender, dateOfBirth, phone, email, address, districtCode"
      />
    </div>
  );
}
