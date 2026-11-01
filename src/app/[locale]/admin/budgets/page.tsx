import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { formatINR } from "@/lib/money";
import { BudgetRowForm } from "./budget-form";

export const dynamic = "force-dynamic";

export default async function BudgetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");

  const [programs, budgets, spentRows] = await Promise.all([
    prisma.program.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.budget.findMany(),
    prisma.expense.groupBy({
      by: ["programId"],
      where: { status: { in: ["APPROVED", "PAID"] }, programId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const budgetByProgram = new Map(budgets.map((b) => [b.programId, b.amount]));
  const spentByProgram = new Map(
    spentRows.map((r) => [r.programId as string, Number(r._sum.amount ?? 0)]),
  );

  const t = await getTranslations("Budgets");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const thNum = "px-3 py-2 text-right font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const tdNum = `${td} text-right tabular-nums`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>{t("program")}</th>
            <th className={th}>{t("budget")}</th>
            <th className={thNum}>{t("spent")}</th>
            <th className={thNum}>{t("remaining")}</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => {
            const budget = budgetByProgram.get(p.id);
            const budgetNum = budget != null ? Number(budget) : 0;
            const spent = spentByProgram.get(p.id) ?? 0;
            const remaining = budgetNum - spent;
            return (
              <tr key={p.id}>
                <td className={td}>{localized(p.name, locale)}</td>
                <td className={td}>
                  <BudgetRowForm
                    locale={locale}
                    programId={p.id}
                    amount={budget != null ? budget.toString() : ""}
                  />
                </td>
                <td className={tdNum}>{formatINR(spent)}</td>
                <td
                  className={`${tdNum} ${budget != null && remaining < 0 ? "text-red-600" : ""}`}
                >
                  {budget != null ? formatINR(remaining) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
