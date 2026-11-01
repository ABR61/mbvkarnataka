import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 20;

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("user.manage");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { userRoles: { include: { role: true } }, district: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const t = await getTranslations("Users");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/users/import"
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            {t("import")}
          </Link>
          <Link
            href="/admin/users/new"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("new")}
          </Link>
        </div>
      </div>

      <SearchBox placeholder={tc("search")} defaultValue={q} />

      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>{t("name")}</th>
            <th className={th}>{t("email")}</th>
            <th className={th}>{t("roles")}</th>
            <th className={th}>{t("branchDistrict")}</th>
            <th className={th}>{tc("status")}</th>
            <th className={th}>{tc("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td className={td}>{u.name ?? "—"}</td>
              <td className={td}>{u.email}</td>
              <td className={td}>
                {u.userRoles.map((ur) => ur.role.name).join(", ") || "—"}
              </td>
              <td className={td}>
                {u.district ? localized(u.district.name, locale) : "—"}
              </td>
              <td className={td}>{t(`status_${u.status}`)}</td>
              <td className={td}>
                <Link
                  href={`/admin/users/${u.id}/edit`}
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

      <Pagination
        basePath="/admin/users"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        query={q}
      />
    </div>
  );
}
