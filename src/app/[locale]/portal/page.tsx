import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { Link } from "@/i18n/navigation";

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

  if (!person) {
    return <p className="text-gray-500">{t("noProfile")}</p>;
  }

  const cohortIds = person.enrollments.map((e) => e.cohortId);
  const sessions = cohortIds.length
    ? await prisma.trainingSession.findMany({
        where: { cohortId: { in: cohortIds } },
        include: {
          course: true,
          attendances: { where: { personId: person.id } },
        },
        orderBy: { sessionDate: "asc" },
      })
    : [];
  const certificates = person.enrollments
    .map((e) => e.certificate)
    .filter((c): c is NonNullable<typeof c> => c != null);

  const card = "rounded-lg border border-gray-200 p-4 dark:border-gray-800";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          {t("greeting", { name: person.firstName })}
        </h1>
        <Link
          href="/portal/profile"
          className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {t("editProfile")}
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("myPrograms")}</h2>
        {person.enrollments.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noPrograms")}</p>
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("mySchedule")}</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noSchedule")}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className={td}>
                    {s.sessionDate.toISOString().slice(0, 10)}
                    {s.startTime ? ` ${s.startTime}` : ""}
                  </td>
                  <td className={td}>{localized(s.course.name, locale)}</td>
                  <td className={`${td} text-gray-500`}>
                    {s.attendances[0]
                      ? t(`attendance_${s.attendances[0].status}`)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("myCertificates")}</h2>
        {certificates.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noCertificates")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {certificates.map((c) => (
              <li key={c.id} className={`${card} flex items-center justify-between`}>
                <div>
                  <div className="font-medium">{localized(c.programName, locale)}</div>
                  <div className="text-xs text-gray-500">
                    {c.serialNumber} · {c.issuedAt.toISOString().slice(0, 10)}
                  </div>
                </div>
                <a
                  href={`/${locale}/verify/${c.verifyCode}`}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  {t("viewCertificate")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
