import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { districtOptions } from "@/lib/options";
import { StaffForm } from "../staff-form";
import { createStaff } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("staff.manage");
  const t = await getTranslations("Staff");

  const scope = scopedDistrictId(session);
  const fixed = scope
    ? await prisma.district.findUnique({ where: { id: scope } })
    : null;
  const districts = scope ? undefined : await districtOptions(locale);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("addStaff")}</h1>
      <StaffForm
        locale={locale}
        action={createStaff}
        districts={districts}
        fixedDistrictName={fixed ? localized(fixed.name, locale) : undefined}
      />
    </div>
  );
}
