import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateWithWeekday } from "@/lib/dates";
import { cohortsAttendance } from "@/lib/attendance";
import { isBelowMinimum, summaryFromCounts } from "@/lib/attendance-rules";
import { todayISO } from "@/lib/dates";
import { StatusPill } from "@/components/ui/badge";
import { ReportAttendance } from "./report-attendance";
import { reportAttendanceIssue } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth(); // layout already enforced auth
  const t = await getTranslations("Portal");

  const person = await prisma.person.findUnique({
    where: { userId: session!.user.id },
    include: {
      enrollments: {
        include: {
          cohort: { include: { program: true, center: true } },
          certificate: true,
        },
        orderBy: { enrolledOn: "desc" },
      },
    },
  });

  // Trainers have their own home (self clock-in + attendance).
  if (person?.kind === "TRAINER") redirect(`/${locale}/trainer`);

  if (!person) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm dark:border-amber-900 dark:bg-amber-950/40">
        <p className="font-medium">{t("noProfile")}</p>
        <p className="mt-1 text-gray-700 dark:text-gray-300">{t("noProfileHelp")}</p>
        <Link href="/contact" className="mt-3 inline-block font-medium text-emerald-700 hover:underline">
          {t("contactUs")} →
        </Link>
      </div>
    );
  }

  const cohortIds = person.enrollments.map((e) => e.cohortId);
  const sessions = cohortIds.length
    ? await prisma.trainingSession.findMany({
        where: { cohortId: { in: cohortIds } },
        omit: { photoUrl: true }, // class photos can be large; not needed here
        include: {
          course: true,
          attendances: { where: { personId: person.id } },
        },
        orderBy: { sessionDate: "asc" },
      })
    : [];
  // Attendance per program (vs its minimum) and any reports under review.
  const [attendanceByCohort, pendingReports] = await Promise.all([
    // One aggregate query for all of this trainee's programs.
    cohortsAttendance(
      person.enrollments.map((e) => e.cohortId),
      { personId: person.id },
    ).then(
      (m) =>
        new Map(
          [...m].map(([cohortId, v]) => [
            cohortId,
            { min: v.min, summary: v.byPerson.get(person.id) ?? summaryFromCounts(0, 0, 0) },
          ]),
        ),
    ),
    prisma.attendanceCorrection.findMany({
      where: { personId: person.id, status: "PENDING" },
      select: { sessionId: true },
    }),
  ]);
  const underReview = new Set(pendingReports.map((r) => r.sessionId));
  const today = todayISO();
  const ta = await getTranslations("Attendance");

  // All of this person's certificates — both enrollment-based and the ones
  // earned by leaving feedback on a completed program.
  const certificates = await prisma.certificate.findMany({
    where: { personId: person.id },
    orderBy: { issuedAt: "desc" },
  });

  // Recent MBV activity (approved posts from across districts).
  const recentPosts = await prisma.post.findMany({
    where: { approved: true },
    include: { district: true },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const card = "rounded-lg border border-gray-200 p-4 dark:border-gray-800";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          {t("greeting", { name: person.firstName })}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {t("home")}
          </Link>
          <Link
            href="/portal/profile"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {t("editProfile")}
          </Link>
          <Link
            href="/portal/feedback"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {t("giveFeedback")}
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("myPrograms")}</h2>
        {person.enrollments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm dark:border-gray-700">
            <p className="text-gray-700 dark:text-gray-300">{t("noPrograms")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/programs" className="rounded-md bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700">
                {t("browsePrograms")}
              </Link>
              <Link href="/apply" className="rounded-md border border-emerald-600 px-3 py-2 font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                {t("applyNow")}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {person.enrollments.map((e) => (
              <li key={e.id} className={card}>
                <div className="font-medium">
                  {localized(e.cohort.program.name, locale)}
                </div>
                <div className="text-sm text-gray-500">
                  {localized(e.cohort.center.name, locale)}
                  {e.cohort.code ? ` · ${e.cohort.code}` : ""} ·{" "}
                  {t(`status_${e.status}`)}
                </div>
                {(() => {
                  const a = attendanceByCohort.get(e.cohortId);
                  if (!a || a.summary.pct === null) return null;
                  const low = isBelowMinimum(a.summary.pct, a.min);
                  return (
                    <div className={`mt-1 text-sm ${low ? "font-medium text-red-700 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {t("myAttendance", { pct: a.summary.pct, min: a.min })}
                      {low && <span className="block text-xs">{t("attendanceWarning", { min: a.min })}</span>}
                    </div>
                  );
                })()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("mySchedule")}</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("noSchedule")}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {/* Trainees see their own attendance so they can spot and report
                  mistakes — reports go to a reviewer, never straight in. */}
              {sessions.map((s) => {
                const mine = s.attendances[0];
                const upcoming = s.sessionDate.toISOString().slice(0, 10) > today;
                return (
                  <tr key={s.id}>
                    <td className={td}>
                      {formatDateWithWeekday(s.sessionDate, locale)}
                      {s.startTime ? ` ${s.startTime}` : ""}
                    </td>
                    <td className={td}>{localized(s.course.name, locale)}</td>
                    <td className={td}>
                      {mine ? (
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill status={mine.status} label={ta(`status_${mine.status}`)} />
                          {underReview.has(s.id) ? (
                            <span className="text-xs text-amber-800 dark:text-amber-300">{t("underReview")}</span>
                          ) : (
                            <ReportAttendance
                              locale={locale}
                              sessionId={s.id}
                              current={mine.status}
                              action={reportAttendanceIssue}
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {upcoming ? t("upcoming") : t("notMarkedYet")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("myCertificates")}</h2>
        {certificates.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("noCertificates")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {certificates.map((c) => (
              <li key={c.id} className={`${card} flex items-center justify-between gap-3`}>
                <div>
                  <div className="font-medium">{localized(c.programName, locale)}</div>
                  <div className="text-xs text-gray-500">
                    {c.serialNumber} · {formatDate(c.issuedAt, locale)}
                  </div>
                </div>
                <Link
                  href={`/portal/certificate/${c.id}`}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  {t("viewCertificate")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("recentActivity")}</h2>
          <Link href="/" className="text-sm text-emerald-700 hover:underline">
            {t("viewAll")} →
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("noActivity")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentPosts.map((p) => (
              <li
                key={p.id}
                className="flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
              >
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="h-28 w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col p-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                    {localized(p.district.name, locale)}
                  </span>
                  <div className="mt-1 text-sm font-medium">{p.title}</div>
                  <time className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {formatDate(p.createdAt, locale)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
