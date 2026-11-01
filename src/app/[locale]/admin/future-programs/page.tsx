import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId, withDistrictScope } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteFutureProgram, setFutureProgramApproval } from "./actions";

export const dynamic = "force-dynamic";

export default async function FutureProgramsAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("program.plan");
  const isSuperAdmin = scopedDistrictId(session) === null;

  const where: Prisma.FutureProgramWhereInput = withDistrictScope(
    {},
    scopedDistrictId(session),
  );
  const rows = await prisma.futureProgram.findMany({
    where,
    include: { district: true },
    orderBy: { createdAt: "desc" },
  });

  const t = await getTranslations("FuturePrograms");
  const tc = await getTranslations("Common");
  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 align-top dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/admin/future-programs/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("nameField")}</th>
              <th className={th}>{t("district")}</th>
              <th className={th}>{t("capacity")}</th>
              <th className={th}>{t("status")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-gray-500">{p.description}</div>
                  {p.objectives && (
                    <div className="mt-1 text-xs text-gray-400">
                      {t("objectives")}: {p.objectives}
                    </div>
                  )}
                  {p.durationWeeks != null && (
                    <div className="mt-1 text-xs text-gray-400">
                      {t("duration")}: {p.durationWeeks} {t(p.durationUnit ?? "weeks")}
                    </div>
                  )}
                </td>
                <td className={td}>{localized(p.district.name, locale)}</td>
                <td className={td}>{p.seats != null ? p.seats : "—"}</td>
                <td className={td}>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.approved
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    }`}
                  >
                    {p.approved ? t("approved") : t("pending")}
                  </span>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    {isSuperAdmin && (
                      <form action={setFutureProgramApproval}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="approved" value={(!p.approved).toString()} />
                        <button
                          type="submit"
                          className={
                            p.approved
                              ? "text-amber-700 hover:underline"
                              : "font-medium text-emerald-700 hover:underline"
                          }
                        >
                          {p.approved ? t("unapprove") : t("approve")}
                        </button>
                      </form>
                    )}
                    <DeleteButton
                      action={deleteFutureProgram}
                      id={p.id}
                      locale={locale}
                      label={tc("delete")}
                      confirmText={t("confirmDelete")}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
