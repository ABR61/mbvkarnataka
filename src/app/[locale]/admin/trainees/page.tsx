import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId, withDistrictScope } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 15;

export default async function TraineesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("trainee.manage");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // Branch admins only see trainees in their own district; super admins see all.
  const where: Prisma.PersonWhereInput = withDistrictScope(
    {
      kind: "TRAINEE",
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    scopedDistrictId(session),
  );

  const [rows, total] = await Promise.all([
    prisma.person.findMany({
      where,
      include: { district: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.person.count({ where }),
  ]);

  const t = await getTranslations("Trainees");
  const tc = await getTranslations("Common");
  const tp = await getTranslations("People");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/trainees/import"
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            {t("import")}
          </Link>
          <Link
            href="/admin/trainees/new"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("new")}
          </Link>
        </div>
      </div>

      <SearchBox placeholder={tc("search")} defaultValue={q} />

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{tp("name")}</th>
              <th className={th}>{tc("phone")}</th>
              <th className={th}>{tc("district")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  {[p.firstName, p.lastName].filter(Boolean).join(" ")}
                </td>
                <td className={td}>{p.phone ?? "—"}</td>
                <td className={td}>
                  {p.district ? localized(p.district.name, locale) : "—"}
                </td>
                <td className={td}>
                  <Link
                    href={`/admin/trainees/${p.id}/edit`}
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
        basePath="/admin/trainees"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        query={q}
      />
    </div>
  );
}
