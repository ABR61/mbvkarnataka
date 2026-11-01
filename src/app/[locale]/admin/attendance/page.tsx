import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { formatDate, formatDateTime } from "@/lib/dates";
import { integrityReport, pendingCorrections } from "@/lib/attendance";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ReviewForm } from "./review-form";
import { reviewCorrection } from "./actions";

export const dynamic = "force-dynamic";

// Attendance integrity review: approve/reject corrections, and look into the
// automatic flags. Branch admins only see their own district.
export default async function AttendanceReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("attendance.review");
  const scope = scopedDistrictId(session);

  const [corrections, report] = await Promise.all([pendingCorrections(scope), integrityReport(scope)]);
  const t = await getTranslations("AttendanceReview");
  const ta = await getTranslations("Attendance");

  const th = "px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400";
  const td = "px-3 py-2 border-t border-gray-100 align-top dark:border-gray-800";
  const h2 = "text-lg font-semibold";
  const none = (msg: string) => <p className="text-sm text-gray-600 dark:text-gray-400">✓ {msg}</p>;
  const sessionLink = (s: { id: string; date: Date; course: unknown; cohortCode: string | null }) => (
    <Link href={`/admin/sessions/${s.id}/attendance`} className="text-emerald-700 hover:underline dark:text-emerald-400">
      {formatDate(s.date, locale)} · {localized(s.course, locale)}
      {s.cohortCode ? ` · ${s.cohortCode}` : ""}
    </Link>
  );

  const counts = [
    { label: t("pending"), n: corrections.length, href: "#corrections" },
    { label: t("evidenceGaps"), n: report.evidence.length, href: "#evidence" },
    { label: t("unmarked"), n: report.unmarked.length, href: "#unmarked" },
    { label: t("doubleBooked"), n: report.doubleBookings.length, href: "#double" },
    { label: t("perfect"), n: report.perfectCohorts.length, href: "#perfect" },
    { label: t("lowAttendance"), n: report.lowAttendance.length, href: "#low" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("intro", { days: report.days })}</p>
      </div>

      {/* At a glance */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map((c) => (
          <a key={c.href} href={c.href}>
            <Card className={c.n > 0 ? "border-amber-300 dark:border-amber-800" : ""}>
              <div className={`text-2xl font-bold ${c.n > 0 ? "text-amber-700 dark:text-amber-300" : ""}`}>{c.n}</div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{c.label}</div>
            </Card>
          </a>
        ))}
      </div>

      {/* 1. Correction requests */}
      <section id="corrections" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className={h2}>{t("pending")}</h2>
        {corrections.length === 0 ? (
          none(t("noPending"))
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th className={th}>{t("trainee")}</th>
                  <th className={th}>{t("session")}</th>
                  <th className={th}>{t("change")}</th>
                  <th className={th}>{t("reasonCol")}</th>
                  <th className={th}>{t("requestedBy")}</th>
                  <th className={th}>{t("decision")}</th>
                </tr>
              </thead>
              <tbody>
                {corrections.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>{c.personName}</td>
                    <td className={td}>
                      {sessionLink({
                        id: c.session.id,
                        date: c.session.sessionDate,
                        course: c.session.course.name,
                        cohortCode: c.session.cohort.code,
                      })}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {c.fromStatus ? (
                        <StatusPill status={c.fromStatus} label={ta(`status_${c.fromStatus}`)} />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">{ta("notMarked")}</span>
                      )}{" "}
                      → <StatusPill status={c.toStatus} label={ta(`status_${c.toStatus}`)} />
                    </td>
                    <td className={`${td} max-w-xs`}>{c.reason}</td>
                    <td className={td}>
                      <Badge tone={c.source === "TRAINEE" ? "blue" : "gray"}>{t(`source_${c.source}`)}</Badge>
                      <span className="block text-xs text-gray-600 dark:text-gray-400">
                        {c.requestedBy} · {formatDateTime(c.requestedAt, locale)}
                      </span>
                    </td>
                    <td className={`${td} w-56`}>
                      <ReviewForm locale={locale} id={c.id} action={reviewCorrection} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Evidence gaps */}
      <section id="evidence" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className={h2}>{t("evidenceGaps")}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("evidenceIntro")}</p>
        {report.evidence.length === 0 ? (
          none(t("noEvidenceGaps"))
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {report.evidence.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2">
                {sessionLink(s)}
                <span className="text-gray-600 dark:text-gray-400">· {localized(s.center, locale)}</span>
                {s.flags.map((f) => (
                  <Badge key={f} tone="amber">
                    {ta(`flag_${f}`)}
                  </Badge>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. Not marked */}
      <section id="unmarked" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className={h2}>{t("unmarked")}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("unmarkedIntro")}</p>
        {report.unmarked.length === 0 ? (
          none(t("noUnmarked"))
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {report.unmarked.map((s) => (
              <li key={s.id}>
                {sessionLink(s)}{" "}
                <span className="text-gray-600 dark:text-gray-400">· {localized(s.center, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Present in two places */}
      <section id="double" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className={h2}>{t("doubleBooked")}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("doubleIntro")}</p>
        {report.doubleBookings.length === 0 ? (
          none(t("noDouble"))
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {report.doubleBookings.map((d, i) => (
              <li key={i}>
                <span className="font-medium">{d.person}</span>: {sessionLink(d.a)} <span aria-hidden>⇄</span> {sessionLink(d.b)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. Perfect records */}
      <section id="perfect" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className={h2}>{t("perfect")}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("perfectIntro")}</p>
        {report.perfectCohorts.length === 0 ? (
          none(t("noPerfect"))
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {report.perfectCohorts.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/cohorts/${c.id}/edit`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                  {localized(c.program.name, locale)}
                  {c.code ? ` · ${c.code}` : ""}
                </Link>{" "}
                <span className="text-gray-600 dark:text-gray-400">
                  · {localized(c.center.name, locale)} · {t("sessionsAllPresent", { n: c.held })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 6. Below minimum */}
      <section id="low" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className={h2}>{t("lowAttendance")}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("lowIntro")}</p>
        {report.lowAttendance.length === 0 ? (
          none(t("noLow"))
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr>
                  <th className={th}>{t("trainee")}</th>
                  <th className={th}>{t("cohort")}</th>
                  <th className={th}>{t("attendance")}</th>
                </tr>
              </thead>
              <tbody>
                {report.lowAttendance.map((r) => (
                  <tr key={`${r.cohortId}-${r.personId}`}>
                    <td className={td}>{r.person}</td>
                    <td className={td}>
                      <Link href={`/admin/cohorts/${r.cohortId}/edit`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                        {localized(r.program, locale)}
                        {r.cohortCode ? ` · ${r.cohortCode}` : ""}
                      </Link>
                    </td>
                    <td className={`${td} tabular-nums`}>
                      <span className="font-semibold text-red-700 dark:text-red-400">{r.pct}%</span>{" "}
                      <span className="text-gray-600 dark:text-gray-400">
                        ({r.attended}/{r.held} · {t("minimum", { min: r.min })})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
