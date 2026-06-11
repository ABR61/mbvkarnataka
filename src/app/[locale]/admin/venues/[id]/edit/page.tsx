import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { DeleteButton } from "@/components/admin/delete-button";
import { VenueForm } from "../../venue-form";
import { updateVenue, deleteVenue } from "../../actions";

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("center.manage");

  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) notFound();

  const centers = await prisma.center.findMany();
  const options = centers
    .map((c) => ({ id: c.id, name: localized(c.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const t = await getTranslations("Venues");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <VenueForm
        locale={locale}
        centers={options}
        action={updateVenue}
        defaults={{
          id: venue.id,
          name: venue.name,
          centerId: venue.centerId,
          capacity: venue.capacity,
        }}
      />

      <div className="max-w-xl border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteVenue}
          id={venue.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
