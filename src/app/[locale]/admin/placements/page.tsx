import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { formatINR } from "@/lib/money";
import { Pagination } from "@/components/admin/pagination";
import { PLACEMENT_STATUSES } from "@/lib/validation/placement";

const PAGE_SIZE = 20;

export default async function PlacementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("placement.manage");

  const sp = await searchParams;
  const status = (PLACEMENT_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof PLACEMENT_STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.PlacementWhereInput = status ? { status } : {};

  const [rows, total] = await Promise.all([
    prisma.placement.findMany({
      where,
      include: { person: true, employer: true },
      orderBy: { placedOn: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.placement.count({ where }),
  ]);

  const t = await getTranslations("Placements");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs ${active ? "bg-emerald-600 text-white" : "border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"}`;

  const personName = (p: { firstName: string; lastName: string | null }) =>
    [p.firstName, p.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/admin/placements/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </Link>
      </div>

      <nav className="flex flex-wrap items-center gap-2">
        <Link href="/admin/placements" className={chip(!status)}>{t("all")}</Link>
        {PLACEMENT_STATUSES.map((s) => (
          <Link key={s} href={`/admin/placements?status=${s}`} className={chip(status === s)}>
            {t(`status_${s}`)}
          </Link>
        ))}
        <span className="ml-auto text-sm text-gray-500">{t("count", { n: total })}</span>
      </nav>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("trainee")}</th>
              <th className={th}>{t("employer")}</th>
              <th className={th}>{t("jobTitle")}</th>
              <th className={th}>{t("monthlySalary")}</th>
              <th className={th}>{t("placedOn")}</th>
              <th className={th}>{tc("status")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={td}>{personName(p.person)}</td>
                <td className={td}>{p.employer.name}</td>
                <td className={td}>{p.jobTitle ?? "—"}</td>
                <td className={`${td} tabular-nums`}>
                  {p.monthlySalary != null ? formatINR(p.monthlySalary.toString()) : "—"}
                </td>
                <td className={td}>{p.placedOn.toISOString().slice(0, 10)}</td>
                <td className={td}>{t(`status_${p.status}`)}</td>
                <td className={td}>
                  <Link href={`/admin/placements/${p.id}/edit`} className="text-emerald-700 hover:underline">
                    {tc("edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination basePath="/admin/placements" page={page} pageSize={PAGE_SIZE} total={total} query="" />
    </div>
  );
}
