import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId, withDistrictScope } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { formatINR } from "@/lib/money";
import { districtOptions } from "@/lib/options";
import { Pagination } from "@/components/admin/pagination";
import { EXPENSE_STATUSES } from "@/lib/validation/expense";
import { formatDate } from "@/lib/dates";

const PAGE_SIZE = 20;

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string; district?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("expense.record");
  const scope = scopedDistrictId(session);

  const sp = await searchParams;
  const status = (EXPENSE_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof EXPENSE_STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const districtFilter = sp.district?.trim() || undefined;

  // Branch admins are locked to their district; the super admin can filter by branch.
  const base: Prisma.ExpenseWhereInput = {};
  if (status) base.status = status;
  if (!scope && districtFilter) base.districtId = districtFilter;
  const where: Prisma.ExpenseWhereInput = withDistrictScope(base, scope);

  // The headline total must not count voided (reversed) expenses. When the user
  // is explicitly viewing one status, total that status as-is; otherwise exclude VOID.
  const totalWhere: Prisma.ExpenseWhereInput = status
    ? where
    : { ...where, status: { not: "VOID" } };

  // District filter dropdown — only for the super admin (branch admins are scoped).
  const districts = scope ? [] : await districtOptions(locale);

  const [rows, total, totalAgg] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { program: true, vendorRecord: true, district: true },
      orderBy: { incurredOn: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where: totalWhere, _sum: { amount: true } }),
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
        {(() => {
          const q = (s?: string) => {
            const p = new URLSearchParams();
            if (s) p.set("status", s);
            if (districtFilter) p.set("district", districtFilter);
            const qs = p.toString();
            return `/admin/expenses${qs ? `?${qs}` : ""}`;
          };
          return (
            <>
              <Link href={q()} className={chip(!status)}>{t("all")}</Link>
              {EXPENSE_STATUSES.map((s) => (
                <Link key={s} href={q(s)} className={chip(status === s)}>
                  {t(`status_${s}`)}
                </Link>
              ))}
            </>
          );
        })()}

        {/* Branch filter — super admin only */}
        {districts.length > 0 && (
          <form className="flex items-center gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <select
              name="district"
              defaultValue={districtFilter ?? ""}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">{t("allBranches")}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button className="rounded-md border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              {t("filter")}
            </button>
          </form>
        )}

        <span className="ml-auto text-sm text-gray-500">
          {t("total")}: <strong>{formatINR((totalAgg._sum.amount ?? 0).toString())}</strong>
        </span>
      </nav>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("date")}</th>
              <th className={th}>{t("amount")}</th>
              <th className={th}>{t("category")}</th>
              <th className={th}>{tc("district")}</th>
              <th className={th}>{t("vendor")}</th>
              <th className={th}>{t("program")}</th>
              <th className={th}>{tc("status")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className={td}>{formatDate(e.incurredOn, locale)}</td>
                <td className={`${td} tabular-nums`}>{formatINR(e.amount.toString())}</td>
                <td className={td}>{e.category ?? "—"}</td>
                <td className={td}>{e.district ? localized(e.district.name, locale) : "—"}</td>
                <td className={td}>{e.vendorRecord?.name ?? e.vendor ?? "—"}</td>
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
        </div>
      )}

      <Pagination basePath="/admin/expenses" page={page} pageSize={PAGE_SIZE} total={total} query="" />
    </div>
  );
}
