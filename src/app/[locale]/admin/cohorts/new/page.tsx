import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { programOptions, centerOptions, personOptions } from "@/lib/options";
import { CohortForm } from "../cohort-form";
import { createCohort } from "../actions";

export default async function NewCohortPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("cohort.manage");

  const [programs, centers, coordinators] = await Promise.all([
    programOptions(locale),
    centerOptions(locale),
    personOptions(["TRAINER", "STAFF"]),
  ]);
  const t = await getTranslations("Cohorts");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <CohortForm
        locale={locale}
        programs={programs}
        centers={centers}
        coordinators={coordinators}
        action={createCohort}
      />
    </div>
  );
}
