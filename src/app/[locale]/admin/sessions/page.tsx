import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { Can } from "@/components/Can";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 15;

export default async function SessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("session.manage");

  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [rows, total] = await Promise.all([
    prisma.trainingSession.findMany({
      include: {
        cohort: { include: { _count: { select: { enrollments: true } } } },
        course: true,
        trainer: true,
        _count: { select: { attendances: true } },
      },
      orderBy: { sessionDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.trainingSession.count(),
  ]);

  const t = await getTranslations("Sessions");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href="/admin/sessions/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("new")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("date")}</th>
              <th className={th}>{t("cohort")}</th>
              <th className={th}>{t("course")}</th>
              <th className={th}>{t("trainer")}</th>
              <th className={th}>{tc("status")}</th>
              <th className={th}>{t("marked")}</th>
              <th className={th}>{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className={td}>
                  {fmtDate(s.sessionDate)}
                  {s.startTime ? ` ${s.startTime}` : ""}
                </td>
                <td className={td}>{s.cohort.code ?? "—"}</td>
                <td className={td}>{localized(s.course.name, locale)}</td>
                <td className={td}>
                  {s.trainer
                    ? [s.trainer.firstName, s.trainer.lastName].filter(Boolean).join(" ")
                    : "—"}
                </td>
                <td className={td}>{t(`status_${s.status}`)}</td>
                <td className={td}>
                  {s._count.attendances}/{s.cohort._count.enrollments}
                </td>
                <td className={`${td} space-x-3 whitespace-nowrap`}>
                  <Can permission="attendance.mark">
                    <Link
                      href={`/admin/sessions/${s.id}/attendance`}
                      className="text-emerald-700 hover:underline"
                    >
                      {t("markAttendance")}
                    </Link>
                  </Can>
                  <Link
                    href={`/admin/sessions/${s.id}/edit`}
                    className="text-gray-600 hover:underline dark:text-gray-300"
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
        basePath="/admin/sessions"
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        query=""
      />
    </div>
  );
}
