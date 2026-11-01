import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId, withDistrictScope } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { Pagination } from "@/components/admin/pagination";
import { APPLICATION_STATUSES } from "@/lib/validation/application";
import { formatDate } from "@/lib/dates";

const PAGE_SIZE = 15;

export default async function ApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("application.manage");

  const sp = await searchParams;
  const status = (APPLICATION_STATUSES as readonly string[]).includes(
    sp.status ?? "",
  )
    ? (sp.status as (typeof APPLICATION_STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // Branch admins only see applications in their own district; super admins see all.
  const where: Prisma.ApplicationWhereInput = withDistrictScope(
    status ? { status } : {},
    scopedDistrictId(session),
  );

  const [rows, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: { program: true, futureProgram: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.application.count({ where }),
  ]);

  const t = await getTranslations("Applications");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs ${active ? "bg-emerald-600 text-white" : "border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"}`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <nav className="flex flex-wrap gap-2">
        <Link href="/admin/applications" className={chip(!status)}>
          {t("all")}
        </Link>
        {APPLICATION_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/applications?status=${s}`}
            className={chip(status === s)}
          >
            {t(`status_${s}`)}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("applicant")}</th>
              <th className={th}>{tc("phone")}</th>
              <th className={th}>{t("program")}</th>
              <th className={th}>{tc("status")}</th>
              <th className={th}>{t("submitted")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className={td}>
                  {[a.firstName, a.lastName].filter(Boolean).join(" ")}
                </td>
                <td className={td}>{a.phone}</td>
                <td className={td}>
                  {a.program
                    ? localized(a.program.name, locale)
                    : a.futureProgram
                      ? a.futureProgram.title
                      : "—"}
                </td>
                <td className={td}>{t(`status_${a.status}`)}</td>
                <td className={td}>{formatDate(a.createdAt, locale)}</td>
                <td className={td}>
                  <Link
                    href={`/admin/applications/${a.id}`}
                    className="text-emerald-700 hover:underline"
                  >
                    {t("review")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <Pagination
        basePath="/admin/applications"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        query=""
      />
    </div>
  );
}
