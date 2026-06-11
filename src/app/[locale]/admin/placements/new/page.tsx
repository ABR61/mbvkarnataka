import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { personOptions, employerOptions } from "@/lib/options";
import { PlacementForm } from "../placement-form";
import { createPlacement } from "../actions";

export default async function NewPlacementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("placement.manage");

  const [trainees, employers] = await Promise.all([
    personOptions(["TRAINEE"]),
    employerOptions(),
  ]);
  const t = await getTranslations("Placements");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <PlacementForm
        locale={locale}
        trainees={trainees}
        employers={employers}
        action={createPlacement}
      />
    </div>
  );
}
