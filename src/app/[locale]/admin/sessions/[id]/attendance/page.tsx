import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { AttendanceForm } from "./attendance-form";
import { CorrectionForm } from "./correction-form";
import { markAttendance, requestCorrection } from "../../actions";
import { formatDate, formatDateTime, formatDateWithWeekday } from "@/lib/dates";
import { markingWindow, sessionFlags } from "@/lib/attendance-rules";
import { Badge, StatusPill } from "@/components/ui/badge";

const personName = (p: { firstName: string; lastName: string | null }) =>
  [p.firstName, p.lastName].filter(Boolean).join(" ");

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("attendance.mark");

  const ts = await prisma.trainingSession.findUnique({
    where: { id },
    include: { course: true, cohort: { include: { center: true } } },
  });
  if (!ts) notFound();

  const [enrollments, attendances, pendingCorrections, logs] = await Promise.all([
    prisma.enrollment.findMany({
      where: { cohortId: ts.cohortId },
      include: { person: true },
      orderBy: { person: { firstName: "asc" } },
    }),
    prisma.attendance.findMany({ where: { sessionId: id } }),
    prisma.attendanceCorrection.findMany({ where: { sessionId: id, status: "PENDING" } }),
    prisma.attendanceLog.findMany({
      where: { sessionId: id },
      include: { person: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  // Names for the people who made changes (logs store user ids).
  const userIds = [...new Set(logs.map((l) => l.changedById).filter((x): x is string => !!x))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const userName = (uid: string | null) => {
    const u = users.find((x) => x.id === uid);
    return u ? (u.name ?? u.email ?? "—") : "—";
  };

  const statusByPerson = new Map(attendances.map((a) => [a.personId, a.status as string]));
  const pendingByPerson = new Map(pendingCorrections.map((c) => [c.personId, c]));
  const roster = enrollments.map((e) => ({
    personId: e.personId,
    name: personName(e.person),
    status: statusByPerson.get(e.personId) ?? null,
  }));

  const win = ts.status === "CANCELLED" ? "cancelled" : markingWindow(ts.sessionDate);
  const marked = attendances.length > 0;
  const center = ts.cohort.center;
  const centerMapped = center.latitude != null && center.longitude != null;
  // Compare against the center allowing for the phone's reported GPS accuracy.
  const effectiveDistance =
    ts.markedDistanceM != null ? Math.max(0, ts.markedDistanceM - (ts.markedAccuracyM ?? 0)) : null;
  const flags = marked
    ? sessionFlags({
        photoUrl: ts.photoUrl,
        markedLat: ts.markedLat,
        markedDistanceM: effectiveDistance,
        centerMapped,
      })
    : [];

  const t = await getTranslations("Attendance");
  const td = "px-3 py-2 border-t border-gray-100 align-top dark:border-gray-800";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {localized(ts.course.name, locale)}
          {ts.cohort.code ? ` · ${ts.cohort.code}` : ""} · {localized(center.name, locale)} ·{" "}
          {formatDateWithWeekday(ts.sessionDate, locale)}
          {ts.startTime ? ` ${ts.startTime}` : ""}
        </p>
      </div>

      {/* Marking window status */}
      <p
        className={`rounded-md px-3 py-2 text-sm ${
          win === "open"
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
        }`}
      >
        {win === "open" && t("windowOpen")}
        {win === "locked" && t("windowLocked")}
        {win === "notYet" && t("windowNotYet", { date: formatDate(ts.sessionDate, locale) })}
        {win === "cancelled" && t("windowCancelled")}
      </p>

      {/* Evidence summary (once marked) */}
      {marked && (
        <section className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row dark:border-gray-800">
          {ts.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ts.photoUrl} alt={t("classPhoto")} className="h-32 w-48 rounded-md object-cover" />
          ) : null}
          <dl className="flex flex-col gap-1 text-sm">
            <div>
              <dt className="inline text-gray-600 dark:text-gray-400">{t("firstMarked")}: </dt>
              <dd className="inline">{ts.firstMarkedAt ? formatDateTime(ts.firstMarkedAt, locale) : "—"}</dd>
            </div>
            <div>
              <dt className="inline text-gray-600 dark:text-gray-400">{t("location")}: </dt>
              <dd className="inline">
                {ts.markedLat == null
                  ? t("notRecorded")
                  : ts.markedDistanceM != null
                    ? t("distanceFromCenter", { m: ts.markedDistanceM, accuracy: ts.markedAccuracyM ?? 0 })
                    : t("recordedCenterUnmapped")}
              </dd>
            </div>
            {flags.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {flags.map((f) => (
                  <Badge key={f} tone="amber">
                    {t(`flag_${f}`)}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="pt-1">
                <Badge tone="green">{t("evidenceComplete")}</Badge>
              </div>
            )}
          </dl>
        </section>
      )}

      {roster.length === 0 ? (
        <p className="py-8 text-center text-gray-600 dark:text-gray-400">{t("noTrainees")}</p>
      ) : win === "open" ? (
        <AttendanceForm
          locale={locale}
          sessionId={id}
          roster={roster}
          existingPhoto={ts.photoUrl}
          action={markAttendance}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full max-w-3xl text-sm">
            <tbody>
              {roster.map((r) => {
                const pending = pendingByPerson.get(r.personId);
                return (
                  <tr key={r.personId}>
                    <td className={td}>{r.name}</td>
                    <td className={td}>
                      {r.status ? (
                        <StatusPill status={r.status} label={t(`status_${r.status}`)} />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">{t("notMarked")}</span>
                      )}
                    </td>
                    <td className={td}>
                      {win === "locked" &&
                        (pending ? (
                          <Badge tone="amber">
                            {t("pendingTo", { status: t(`status_${pending.toStatus}`) })}
                          </Badge>
                        ) : (
                          <CorrectionForm
                            locale={locale}
                            sessionId={id}
                            personId={r.personId}
                            current={r.status}
                            action={requestCorrection}
                          />
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Change history — every mark and approved correction, newest first */}
      {logs.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            {t("history")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className={`${td} whitespace-nowrap`}>{formatDateTime(l.createdAt, locale)}</td>
                    <td className={td}>{personName(l.person)}</td>
                    <td className={td}>
                      {l.fromStatus ? t(`status_${l.fromStatus}`) : "—"} → {t(`status_${l.toStatus}`)}
                    </td>
                    <td className={td}>
                      <Badge tone={l.kind === "CORRECTION" ? "blue" : "gray"}>{t(`kind_${l.kind}`)}</Badge>
                      {l.reason && <span className="block text-xs text-gray-600 dark:text-gray-400">{l.reason}</span>}
                    </td>
                    <td className={td}>{userName(l.changedById)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
