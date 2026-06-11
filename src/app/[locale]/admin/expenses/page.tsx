import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { formatINR } from "@/lib/money";
import { Pagination } from "@/components/admin/pagination";
import { EXPENSE_STATUSES } from "@/lib/validation/expense";

const PAGE_SIZE = 20;

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");

  const sp = await searchParams;
  const status = (EXPENSE_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof EXPENSE_STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ExpenseWhereInput = status ? { status } : {};

  const [rows, total, totalAgg] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { program: true },
      orderBy: { incurredOn: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  const t = await getTranslations("Expenses");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs ${active ? "bg-emerald-600 text-white" : "border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/admin/expenses/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </Link>
      </div>

      <nav className="flex flex-wrap items-center gap-2">
        <Link href="/admin/expenses" className={chip(!status)}>{t("all")}</Link>
        {EXPENSE_STATUSES.map((s) => (
          <Link key={s} href={`/admin/expenses?status=${s}`} className={chip(status === s)}>
            {t(`status_${s}`)}
          </Link>
        ))}
        <span className="ml-auto text-sm text-gray-500">
          {t("total")}: <strong>{formatINR((totalAgg._sum.amount ?? 0).toString())}</strong>
        </span>
      </nav>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("date")}</th>
              <th className={th}>{t("amount")}</th>
              <th className={th}>{t("category")}</th>
              <th className={th}>{t("vendor")}</th>
              <th className={th}>{t("program")}</th>
              <th className={th}>{tc("status")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className={td}>{e.incurredOn.toISOString().slice(0, 10)}</td>
                <td className={`${td} tabular-nums`}>{formatINR(e.amount.toString())}</td>
                <td className={td}>{e.category ?? "—"}</td>
                <td className={td}>{e.vendor ?? "—"}</td>
                <td className={td}>{e.program ? localized(e.program.name, locale) : "—"}</td>
                <td className={td}>{t(`status_${e.status}`)}</td>
                <td className={td}>
                  <Link href={`/admin/expenses/${e.id}/edit`} className="text-emerald-700 hover:underline">
                    {tc("edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination basePath="/admin/expenses" page={page} pageSize={PAGE_SIZE} total={total} query="" />
    </div>
  );
}
