import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId, withDistrictScope } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteStaff } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("staff.manage");

  // Branch admins see only their district's staff; super admins see all.
  const where: Prisma.PersonWhereInput = withDistrictScope(
    { kind: { in: ["STAFF", "TRAINER"] } },
    scopedDistrictId(session),
  );
  const staff = await prisma.person.findMany({
    where,
    include: { district: true },
    orderBy: [{ firstName: "asc" }],
  });

  const t = await getTranslations("Staff");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`/${locale}/clock`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {t("clockKiosk")}
          </a>
          <Link
            href="/admin/staff/attendance"
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            {t("attendance")}
          </Link>
          <Link
            href="/admin/staff/new"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("addStaff")}
          </Link>
        </div>
      </div>

      {staff.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("name")}</th>
              <th className={th}>{t("role")}</th>
              <th className={th}>{t("phone")}</th>
              <th className={th}>{tc("district")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td className={td}>
                  <Link
                    href={`/admin/staff/${s.id}`}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    {[s.firstName, s.lastName].filter(Boolean).join(" ")}
                  </Link>
                </td>
                <td className={td}>{s.address ?? "—"}</td>
                <td className={td}>{s.phone ?? "—"}</td>
                <td className={td}>
                  {s.district ? localized(s.district.name, locale) : "—"}
                </td>
                <td className={td}>
                  <DeleteButton
                    action={deleteStaff}
                    id={s.id}
                    locale={locale}
                    label={tc("delete")}
                    confirmText={t("confirmDelete")}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
