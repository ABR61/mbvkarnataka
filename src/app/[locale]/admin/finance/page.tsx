import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { formatINR } from "@/lib/money";
import { financialStatus, grantUtilization, budgetVsActual } from "@/lib/finance";
import { Card, Kpi } from "@/components/ui/card";
import { Badge, StatusPill } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function FinanceStatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");
  const [f, funds, budgets] = await Promise.all([
    financialStatus(locale),
    grantUtilization(),
    budgetVsActual(),
  ]);
  const t = await getTranslations("Finance");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const thNum = "px-3 py-2 text-right font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const tdNum = `${td} text-right tabular-nums`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/admin/expenses/new" className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            {t("addExpense")}
          </Link>
          <Link href="/admin/grants/new" className="rounded-md border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
            {t("addGrant")}
          </Link>
        </div>
      </div>

      {/* Headline numbers */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t("income")} value={formatINR(f.income)} accent="text-emerald-700" />
        <Kpi label={t("expenses")} value={formatINR(f.expensesTotal)} accent="text-red-600" />
        <Kpi
          label={t("balance")}
          value={formatINR(f.balance)}
          accent={f.balance >= 0 ? "text-emerald-700" : "text-red-600"}
        />
        <Kpi label={t("budget")} value={formatINR(f.budget)} />
      </section>

      {/* Salary & events + expense status */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("highlights")}
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-300">{t("salary")}</dt>
              <dd className="font-semibold tabular-nums">{formatINR(f.salary)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-300">{t("events")}</dt>
              <dd className="font-semibold tabular-nums">{formatINR(f.events)}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("byStatus")}
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            {(["PAID", "APPROVED", "PENDING"] as const).map((s) => (
              <div key={s} className="flex items-center justify-between">
                <dt>
                  <StatusPill status={s} label={t(`status_${s}`)} />
                </dt>
                <dd className="font-semibold tabular-nums">
                  {formatINR(s === "PAID" ? f.paid : s === "APPROVED" ? f.approved : f.pending)}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      {/* Spend by category */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("byCategory")}
        </h2>
        {f.byCategory.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noExpenses")}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{t("category")}</th>
                <th className={thNum}>{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              {f.byCategory.map((c) => (
                <tr key={c.category}>
                  <td className={td}>{c.category}</td>
                  <td className={tdNum}>{formatINR(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      {/* Spend by branch (district) — what each branch admin reported */}
      {f.byDistrict.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("byDistrict")}
          </h2>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{t("branch")}</th>
                <th className={thNum}>{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              {f.byDistrict.map((d) => (
                <tr key={d.district}>
                  <td className={td}>
                    {d.districtId ? (
                      <Link
                        href={`/admin/expenses?district=${d.districtId}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {d.district}
                      </Link>
                    ) : (
                      d.district
                    )}
                  </td>
                  <td className={tdNum}>{formatINR(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}

      {/* Fund accounting: grant utilisation */}
      {funds.grants.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("grantUtilisation")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className={th}>{t("funder")}</th>
                  <th className={thNum}>{t("received")}</th>
                  <th className={thNum}>{t("committed")}</th>
                  <th className={thNum}>{t("remaining")}</th>
                  <th className={th}>{t("flags")}</th>
                </tr>
              </thead>
              <tbody>
                {funds.grants.map((g) => (
                  <tr key={g.id}>
                    <td className={td}>
                      {g.funder}
                      {g.purpose && (
                        <span className="block text-xs text-gray-400">{g.purpose}</span>
                      )}
                    </td>
                    <td className={tdNum}>{formatINR(g.amount)}</td>
                    <td className={tdNum}>{formatINR(g.committed)}</td>
                    <td className={`${tdNum} ${g.overspent ? "text-red-600" : ""}`}>
                      {formatINR(g.remaining)}
                    </td>
                    <td className={td}>
                      <span className="flex flex-wrap gap-1">
                        {g.restricted && <Badge tone="blue">{t("restricted")}</Badge>}
                        {g.foreignSource && <Badge tone="amber">{t("fcra")}</Badge>}
                        {g.overspent && <Badge tone="red">{t("overspent")}</Badge>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {funds.unallocatedCommitted > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {t("unallocated")}: {formatINR(funds.unallocatedCommitted)}
            </p>
          )}
        </section>
      )}

      {/* Budget vs actual */}
      {budgets.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("budgetVsActual")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr>
                  <th className={th}>{t("program")}</th>
                  <th className={thNum}>{t("budget")}</th>
                  <th className={thNum}>{t("actual")}</th>
                  <th className={thNum}>{t("remaining")}</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b) => (
                  <tr key={b.programId}>
                    <td className={td}>
                      {localized(b.name, locale)}
                      {b.over && (
                        <Badge tone="red" className="ml-2">
                          {t("overBudget")}
                        </Badge>
                      )}
                    </td>
                    <td className={tdNum}>{formatINR(b.budget)}</td>
                    <td className={tdNum}>{formatINR(b.actual)}</td>
                    <td className={`${tdNum} ${b.over ? "text-red-600" : ""}`}>
                      {formatINR(b.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent expenses */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("recent")}
          </h2>
          <Link href="/admin/expenses" className="text-sm text-emerald-700 hover:underline">
            {t("allExpenses")} →
          </Link>
        </div>
        {f.recent.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noExpenses")}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{t("date")}</th>
                <th className={th}>{t("category")}</th>
                <th className={th}>{t("statusLabel")}</th>
                <th className={thNum}>{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              {f.recent.map((e) => (
                <tr key={e.id}>
                  <td className={td}>{formatDate(e.incurredOn, locale)}</td>
                  <td className={td}>{e.category}</td>
                  <td className={td}>
                    <StatusPill status={e.status} label={t(`status_${e.status}`)} />
                  </td>
                  <td className={tdNum}>{formatINR(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </div>
  );
}
