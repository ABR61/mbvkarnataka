import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { districtOptions } from "@/lib/options";
import { FutureProgramForm } from "../future-program-form";
import { createFutureProgram } from "../actions";

export default async function NewFutureProgramPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("program.plan");
  const t = await getTranslations("FuturePrograms");

  const scope = scopedDistrictId(session);
  const fixed = scope
    ? await prisma.district.findUnique({ where: { id: scope } })
    : null;
  const districts = scope ? undefined : await districtOptions(locale);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <p className="max-w-xl text-sm text-gray-500">{t("newIntro")}</p>
      <FutureProgramForm
        locale={locale}
        action={createFutureProgram}
        districts={districts}
        fixedDistrictName={fixed ? localized(fixed.name, locale) : undefined}
      />
    </div>
  );
}
