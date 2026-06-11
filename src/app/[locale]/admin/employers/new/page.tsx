import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { districtOptions } from "@/lib/options";
import { EmployerForm } from "../employer-form";
import { createEmployer } from "../actions";

export default async function NewEmployerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("placement.manage");

  const districts = await districtOptions(locale);
  const t = await getTranslations("Employers");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <EmployerForm locale={locale} districts={districts} action={createEmployer} />
    </div>
  );
}
