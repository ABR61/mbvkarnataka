import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 10;

export default async function ProgramsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("cohort.manage");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ProgramWhereInput = q
    ? {
        OR: [
          { name: { path: ["en"], string_contains: q } },
          { name: { path: ["kn"], string_contains: q } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.program.findMany({
      where,
      include: { _count: { select: { courses: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.program.count({ where }),
  ]);

  const t = await getTranslations("Programs");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/admin/programs/new"
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
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("name")}</th>
              <th className={th}>{t("category")}</th>
              <th className={th}>{t("courses")}</th>
              <th className={th}>{tc("status")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={td}>{localized(p.name, locale)}</td>
                <td className={td}>{p.category ?? "—"}</td>
                <td className={td}>{p._count.courses}</td>
                <td className={td}>
                  {p.status === "active" ? tc("active") : tc("inactive")}
                </td>
                <td className={td}>
                  <Link
                    href={`/admin/programs/${p.id}/edit`}
                    className="text-emerald-700 hover:underline"
                  >
                    {tc("edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <Pagination
        basePath="/admin/programs"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        query={q}
      />
    </div>
  );
}
