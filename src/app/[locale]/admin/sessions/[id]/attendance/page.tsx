import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { AttendanceForm } from "./attendance-form";
import { markAttendance } from "../../actions";
import { formatDateWithWeekday } from "@/lib/dates";

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
    include: { course: true, cohort: true },
  });
  if (!ts) notFound();

  const [enrollments, attendances] = await Promise.all([
    prisma.enrollment.findMany({
      where: { cohortId: ts.cohortId },
      include: { person: true },
      orderBy: { person: { firstName: "asc" } },
    }),
    prisma.attendance.findMany({ where: { sessionId: id } }),
  ]);

  const statusByPerson = new Map(attendances.map((a) => [a.personId, a.status]));
  const roster = enrollments.map((e) => ({
    personId: e.personId,
    name: personName(e.person),
    status: statusByPerson.get(e.personId) ?? "PRESENT",
  }));

  const t = await getTranslations("Attendance");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-gray-500">
          {localized(ts.course.name, locale)}
          {ts.cohort.code ? ` · ${ts.cohort.code}` : ""} ·{" "}
          {formatDateWithWeekday(ts.sessionDate, locale)}
        </p>
      </div>

      {roster.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("noTrainees")}</p>
      ) : (
        <AttendanceForm
          locale={locale}
          sessionId={id}
          roster={roster}
          action={markAttendance}
        />
      )}
    </div>
  );
}
