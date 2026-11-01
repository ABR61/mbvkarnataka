import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { completionProgramName } from "@/lib/program-ref";
import { DeleteButton } from "@/components/admin/delete-button";
import { setFeedbackApproval, deleteFeedback } from "./actions";

export const dynamic = "force-dynamic";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

export default async function AdminFeedbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("feedback.manage");
  const scope = scopedDistrictId(session);
  const isSuperAdmin = scope === null;

  // Branch admins see only their district's feedback; super admins see all.
  const where: Prisma.FeedbackWhereInput = scope
    ? { completion: { districtId: scope } }
    : {};
  const feedback = await prisma.feedback.findMany({
    where,
    include: {
      completion: {
        include: { program: true, futureProgram: true, user: true },
      },
    },
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
  });

  const t = await getTranslations("AdminFeedback");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 align-top dark:border-gray-800";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isSuperAdmin ? t("introSuper") : t("introBranch")}
        </p>
      </div>

      {feedback.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("participant")}</th>
              <th className={th}>{t("program")}</th>
              <th className={th}>{t("rating")}</th>
              <th className={th}>{t("comment")}</th>
              <th className={th}>{t("status")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map((f) => (
              <tr key={f.id}>
                <td className={td}>
                  {f.completion.user.name ?? f.completion.user.email}
                </td>
                <td className={td}>
                  {completionProgramName(f.completion, locale)}
                </td>
                <td className={`${td} whitespace-nowrap text-amber-500`}>
                  {stars(f.rating)}
                </td>
                <td className={`${td} max-w-xs text-gray-600 dark:text-gray-300`}>
                  {f.comment ?? "—"}
                </td>
                <td className={td}>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      f.approved
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    }`}
                  >
                    {f.approved ? t("published") : t("pending")}
                  </span>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    {isSuperAdmin && (
                      <form action={setFeedbackApproval}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={f.id} />
                        <input
                          type="hidden"
                          name="approved"
                          value={(!f.approved).toString()}
                        />
                        <button
                          type="submit"
                          className={
                            f.approved
                              ? "text-amber-700 hover:underline"
                              : "font-medium text-emerald-700 hover:underline"
                          }
                        >
                          {f.approved ? t("unpublish") : t("publish")}
                        </button>
                      </form>
                    )}
                    <DeleteButton
                      action={deleteFeedback}
                      id={f.id}
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
