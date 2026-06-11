import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import {
  programOptions,
  cohortOptions,
  centerOptions,
  vendorOptions,
} from "@/lib/options";
import { DeleteButton } from "@/components/admin/delete-button";
import { ExpenseForm } from "../../expense-form";
import { updateExpense, deleteExpense } from "../../actions";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) notFound();

  const [programs, cohorts, centers, vendors] = await Promise.all([
    programOptions(locale),
    cohortOptions(locale),
    centerOptions(locale),
    vendorOptions(),
  ]);
  const t = await getTranslations("Expenses");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <ExpenseForm
        locale={locale}
        programs={programs}
        cohorts={cohorts}
        centers={centers}
        vendors={vendors}
        action={updateExpense}
        defaults={{
          id: expense.id,
          amount: expense.amount.toString(),
          incurredOn: expense.incurredOn.toISOString().slice(0, 10),
          category: expense.category ?? "",
          vendorId: expense.vendorId ?? "",
          note: expense.note ?? "",
          programId: expense.programId ?? "",
          cohortId: expense.cohortId ?? "",
          centerId: expense.centerId ?? "",
          status: expense.status,
        }}
      />

      <div className="max-w-xl border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteExpense}
          id={expense.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
