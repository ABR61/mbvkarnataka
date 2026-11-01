import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 15;

export default async function CoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("cohort.manage");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.CourseWhereInput = q
    ? {
        OR: [
          { name: { path: ["en"], string_contains: q } },
          { name: { path: ["kn"], string_contains: q } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: { program: true },
      orderBy: [{ programId: "asc" }, { sequence: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.course.count({ where }),
  ]);

  const t = await getTranslations("Courses");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/admin/courses/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </Link>
      </div>

      <SearchBox placeholder={tc("search")} defaultValue={q} />

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("sequence")}</th>
              <th className={th}>{t("name")}</th>
              <th className={th}>{t("program")}</th>
              <th className={th}>{t("hours")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className={td}>{c.sequence}</td>
                <td className={td}>{localized(c.name, locale)}</td>
                <td className={td}>{localized(c.program.name, locale)}</td>
                <td className={td}>{c.hours ?? "—"}</td>
                <td className={td}>
                  <Link
                    href={`/admin/courses/${c.id}/edit`}
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
        basePath="/admin/courses"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        query={q}
      />
    </div>
  );
}
