import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { VenueForm } from "../venue-form";
import { createVenue } from "../actions";

export default async function NewVenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("center.manage");

  const centers = await prisma.center.findMany();
  const options = centers
    .map((c) => ({ id: c.id, name: localized(c.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const t = await getTranslations("Venues");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <VenueForm locale={locale} centers={options} action={createVenue} />
    </div>
  );
}
