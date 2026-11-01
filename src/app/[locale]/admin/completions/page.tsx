import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId, withDistrictScope } from "@/lib/branch-scope";
import { completionProgramName } from "@/lib/program-ref";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteCompletion } from "./actions";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function CompletionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("feedback.manage");

  // Branch admins see only completions they tagged to their district.
  const where: Prisma.CompletionWhereInput = withDistrictScope(
    {},
    scopedDistrictId(session),
  );
  const completions = await prisma.completion.findMany({
    where,
    include: {
      program: true,
      futureProgram: true,
      user: true,
      feedback: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const t = await getTranslations("Completions");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 align-top dark:border-gray-800";

  const toneClass = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  };
  const badge = (label: string, tone: keyof typeof toneClass) => (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass[tone]}`}
    >
      {label}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
        </div>
        <Link
          href="/admin/completions/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </Link>
      </div>

      {completions.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("participant")}</th>
              <th className={th}>{t("program")}</th>
              <th className={th}>{t("feedbackStatus")}</th>
              <th className={th}>{t("date")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {completions.map((c) => (
              <tr key={c.id}>
                <td className={td}>{c.user.name ?? c.user.email}</td>
                <td className={td}>{completionProgramName(c, locale)}</td>
                <td className={td}>
                  {!c.feedback
                    ? badge(t("awaiting"), "gray")
                    : c.feedback.approved
                      ? badge(`★${c.feedback.rating} · ${t("published")}`, "green")
                      : badge(`★${c.feedback.rating} · ${t("pendingReview")}`, "amber")}
                </td>
                <td className={td}>{formatDate(c.createdAt, locale)}</td>
                <td className={td}>
                  <DeleteButton
                    action={deleteCompletion}
                    id={c.id}
                    locale={locale}
                    label={tc("delete")}
                    confirmText={t("confirmDelete")}
                  />
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
