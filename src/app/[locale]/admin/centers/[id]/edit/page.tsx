import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { DeleteButton } from "@/components/admin/delete-button";
import { CenterForm } from "../../center-form";
import { updateCenter, deleteCenter } from "../../actions";

export default async function EditCenterPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("center.manage");

  const center = await prisma.center.findUnique({ where: { id } });
  if (!center) notFound();

  const districts = await prisma.district.findMany();
  const options = districts
    .map((d) => ({ id: d.id, name: localized(d.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const name = (center.name ?? {}) as { en?: string; kn?: string };
  const t = await getTranslations("Centers");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <CenterForm
        locale={locale}
        districts={options}
        action={updateCenter}
        defaults={{
          id: center.id,
          nameEn: name.en ?? "",
          nameKn: name.kn ?? "",
          districtId: center.districtId,
          address: center.address ?? "",
          contactPhone: center.contactPhone ?? "",
          latitude: center.latitude,
          longitude: center.longitude,
          status: center.status,
        }}
      />

      <div className="max-w-xl border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteCenter}
          id={center.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
