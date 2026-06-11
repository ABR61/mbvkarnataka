import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 20;

export default async function EmployersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("placement.manage");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.EmployerWhereInput = q
    ? { name: { contains: q, mode: "insensitive" } }
    : {};

  const [rows, total] = await Promise.all([
    prisma.employer.findMany({
      where,
      include: { district: true, _count: { select: { placements: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.employer.count({ where }),
  ]);

  const t = await getTranslations("Employers");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/admin/employers/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </Link>
      </div>

      <SearchBox placeholder={tc("search")} defaultValue={q} />

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("name")}</th>
              <th className={th}>{t("sector")}</th>
              <th className={th}>{t("district")}</th>
              <th className={th}>{t("placements")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className={td}>{e.name}</td>
                <td className={td}>{e.sector ?? "—"}</td>
                <td className={td}>{e.district ? localized(e.district.name, locale) : "—"}</td>
                <td className={td}>{e._count.placements}</td>
                <td className={td}>
                  <Link href={`/admin/employers/${e.id}/edit`} className="text-emerald-700 hover:underline">
                    {tc("edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination basePath="/admin/employers" page={page} pageSize={PAGE_SIZE} total={total} query={q} />
    </div>
  );
}
