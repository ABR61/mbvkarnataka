import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { CenterForm } from "../center-form";
import { createCenter } from "../actions";

export default async function NewCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("center.manage");

  const districts = await prisma.district.findMany();
  const options = districts
    .map((d) => ({ id: d.id, name: localized(d.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const t = await getTranslations("Centers");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <CenterForm locale={locale} districts={options} action={createCenter} />
    </div>
  );
}
