import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 15;

export default async function DistrictsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("center.manage");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.DistrictWhereInput = q
    ? {
        OR: [
          { name: { path: ["en"], string_contains: q } },
          { name: { path: ["kn"], string_contains: q } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.district.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.district.count({ where }),
  ]);

  const t = await getTranslations("Districts");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SearchBox placeholder={tc("search")} defaultValue={q} />

      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>{t("name")}</th>
            <th className={th}>{t("code")}</th>
            <th className={th}>{t("state")}</th>
            <th className={th}>{tc("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td className={td}>{localized(d.name, locale)}</td>
              <td className={td}>{d.code ?? "—"}</td>
              <td className={td}>{d.state}</td>
              <td className={td}>
                <Link
                  href={`/admin/districts/${d.id}/edit`}
                  className="text-emerald-700 hover:underline"
                >
                  {tc("edit")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        basePath="/admin/districts"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        query={q}
      />
    </div>
  );
}
