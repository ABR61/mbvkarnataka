import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import {
  programOptions,
  cohortOptions,
  centerOptions,
  vendorOptions,
  grantOptions,
  districtOptions,
} from "@/lib/options";
import { ExpenseForm } from "../expense-form";
import { createExpense } from "../actions";

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("expense.record");

  const scope = scopedDistrictId(session);
  const [programs, cohorts, centers, vendors, grants, districts, fixed] =
    await Promise.all([
      programOptions(locale),
      cohortOptions(locale),
      centerOptions(locale),
      vendorOptions(),
      grantOptions(),
      scope ? Promise.resolve(undefined) : districtOptions(locale),
      scope
        ? prisma.district.findUnique({ where: { id: scope } })
        : Promise.resolve(null),
    ]);
  const t = await getTranslations("Expenses");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <ExpenseForm
        locale={locale}
        programs={programs}
        cohorts={cohorts}
        centers={centers}
        vendors={vendors}
        grants={grants}
        districts={districts}
        fixedDistrictName={fixed ? localized(fixed.name, locale) : undefined}
        action={createExpense}
      />
    </div>
  );
}
