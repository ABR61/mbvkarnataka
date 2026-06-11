import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { districtOptions } from "@/lib/options";
import { TraineeForm } from "../trainee-form";
import { createTrainee } from "../actions";

export default async function NewTraineePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("trainee.manage");

  const districts = await districtOptions(locale);
  const t = await getTranslations("Trainees");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <TraineeForm
        locale={locale}
        districts={districts}
        action={createTrainee}
        showConsent
      />
    </div>
  );
}
