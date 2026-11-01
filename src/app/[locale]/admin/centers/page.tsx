import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 10;

export default async function CentersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("center.manage");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.CenterWhereInput = q
    ? {
        OR: [
          { name: { path: ["en"], string_contains: q } },
          { name: { path: ["kn"], string_contains: q } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.center.findMany({
      where,
      include: { district: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.center.count({ where }),
  ]);

  const t = await getTranslations("Centers");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/admin/centers/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </Link>
      </div>

      {sp.error === "inUse" && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {t("inUse")}
        </p>
      )}

      <SearchBox placeholder={tc("search")} defaultValue={q} />

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("name")}</th>
              <th className={th}>{tc("district")}</th>
              <th className={th}>{tc("status")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className={td}>{localized(c.name, locale)}</td>
                <td className={td}>{localized(c.district.name, locale)}</td>
                <td className={td}>
                  {c.status === "ACTIVE" ? tc("active") : tc("inactive")}
                </td>
                <td className={td}>
                  <Link
                    href={`/admin/centers/${c.id}/edit`}
                    className="text-emerald-700 hover:underline"
                  >
                    {tc("edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination
        basePath="/admin/centers"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        query={q}
      />
    </div>
  );
}
