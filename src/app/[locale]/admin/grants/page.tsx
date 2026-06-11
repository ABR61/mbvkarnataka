import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { formatINR } from "@/lib/money";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 20;

export default async function GrantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");

  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [rows, total, agg] = await Promise.all([
    prisma.grant.findMany({
      orderBy: { receivedOn: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.grant.count(),
    prisma.grant.aggregate({ _sum: { amount: true } }),
  ]);

  const t = await getTranslations("Grants");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/admin/grants/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </Link>
      </div>

      <p className="text-sm text-gray-500">
        {t("totalReceived")}:{" "}
        <strong>{formatINR((agg._sum.amount ?? 0).toString())}</strong>
      </p>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("receivedOn")}</th>
              <th className={th}>{t("funder")}</th>
              <th className={th}>{t("amount")}</th>
              <th className={th}>{t("reference")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id}>
                <td className={td}>{g.receivedOn.toISOString().slice(0, 10)}</td>
                <td className={td}>{g.funder}</td>
                <td className={`${td} tabular-nums`}>{formatINR(g.amount.toString())}</td>
                <td className={td}>{g.reference ?? "—"}</td>
                <td className={td}>
                  <Link href={`/admin/grants/${g.id}/edit`} className="text-emerald-700 hover:underline">
                    {tc("edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination basePath="/admin/grants" page={page} pageSize={PAGE_SIZE} total={total} query="" />
    </div>
  );
}
