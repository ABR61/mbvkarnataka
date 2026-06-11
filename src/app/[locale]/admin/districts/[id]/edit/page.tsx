import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { DistrictForm } from "../../district-form";
import { updateDistrict } from "../../actions";

export default async function EditDistrictPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("center.manage");

  const district = await prisma.district.findUnique({ where: { id } });
  if (!district) notFound();

  const name = (district.name ?? {}) as { en?: string; kn?: string };
  const t = await getTranslations("Districts");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>
      <DistrictForm
        locale={locale}
        action={updateDistrict}
        defaults={{
          id: district.id,
          nameEn: name.en ?? "",
          nameKn: name.kn ?? "",
          code: district.code ?? "",
          state: district.state,
        }}
      />
    </div>
  );
}
