import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { districtOptions } from "@/lib/options";
import { TrainerForm } from "../trainer-form";
import { createTrainer } from "../actions";

export default async function NewTrainerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("trainer.manage");

  const districts = await districtOptions(locale);
  const t = await getTranslations("Trainers");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <TrainerForm
        locale={locale}
        districts={districts}
        action={createTrainer}
        mode="create"
      />
    </div>
  );
}
