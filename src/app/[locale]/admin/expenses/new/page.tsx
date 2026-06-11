import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { programOptions, cohortOptions, centerOptions } from "@/lib/options";
import { ExpenseForm } from "../expense-form";
import { createExpense } from "../actions";

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");

  const [programs, cohorts, centers] = await Promise.all([
    programOptions(locale),
    cohortOptions(locale),
    centerOptions(locale),
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
        action={createExpense}
      />
    </div>
  );
}
