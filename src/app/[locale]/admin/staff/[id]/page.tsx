import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { RegisterBiometric } from "@/components/admin/register-biometric";

export const dynamic = "force-dynamic";

const toMin = (t: string | null) => {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Hours worked between check-in and check-out, e.g. "7h 30m". */
function hoursWorked(inT: string | null, outT: string | null): string {
  const a = toMin(inT);
  const b = toMin(outT);
  if (a == null || b == null || b < a) return "—";
  const mins = b - a;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("staff.manage");

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      district: true,
      staffAttendances: { orderBy: { date: "desc" } },
      credentials: true,
    },
  });
  if (!person || (person.kind !== "STAFF" && person.kind !== "TRAINER")) notFound();
  assertDistrict(session, person.districtId); // branch admins: own district only

  const t = await getTranslations("Staff");

  const recs = person.staffAttendances;
  const count = (s: string) => recs.filter((r) => r.status === s).length;
  const totalMinutes = recs.reduce((sum, r) => {
    const a = toMin(r.checkIn);
    const b = toMin(r.checkOut);
    return a != null && b != null && b >= a ? sum + (b - a) : sum;
  }, 0);
  const totalHours = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const card = "rounded-lg border border-gray-200 p-4 dark:border-gray-800";
  const statusTone: Record<string, string> = {
    PRESENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    ABSENT: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    LATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    EXCUSED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    HOLIDAY: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/staff" className="text-sm text-gray-500 hover:underline">
          ← {t("title")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {[person.firstName, person.lastName].filter(Boolean).join(" ")}
        </h1>
        <p className="text-sm text-gray-500">
          {person.address ? `${person.address} · ` : ""}
          {person.district ? localized(person.district.name, locale) : "—"}
          {person.phone ? ` · ${person.phone}` : ""}
        </p>
      </div>

      {/* Biometric clock-in enrolment */}
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("biometric")}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {person.credentials.length > 0
            ? t("biometricEnrolled", { count: person.credentials.length })
            : t("biometricNone")}
        </p>
        <p className="mt-1 mb-3 text-xs text-gray-500">{t("biometricHint")}</p>
        <RegisterBiometric personId={person.id} />
      </section>

      {/* Attendance summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className={card}>
          <div className="text-xl font-bold">{recs.length}</div>
          <div className="text-xs text-gray-500">{t("daysMarked")}</div>
        </div>
        <div className={card}>
          <div className="text-xl font-bold text-emerald-700">{count("PRESENT")}</div>
          <div className="text-xs text-gray-500">{t("status_PRESENT")}</div>
        </div>
        <div className={card}>
          <div className="text-xl font-bold text-red-600">{count("ABSENT")}</div>
          <div className="text-xs text-gray-500">{t("status_ABSENT")}</div>
        </div>
        <div className={card}>
          <div className="text-xl font-bold text-amber-600">{count("LATE")}</div>
          <div className="text-xs text-gray-500">{t("status_LATE")}</div>
        </div>
        <div className={card}>
          <div className="text-xl font-bold">{totalHours}</div>
          <div className="text-xs text-gray-500">{t("totalHours")}</div>
        </div>
      </section>

      {/* Full attendance log */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("attendanceHistory")}
        </h2>
        {recs.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noAttendance")}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr>
                <th className={th}>{t("date")}</th>
                <th className={th}>{t("status")}</th>
                <th className={th}>{t("checkIn")}</th>
                <th className={th}>{t("checkOut")}</th>
                <th className={th}>{t("hours")}</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.date.toISOString().slice(0, 10)}</td>
                  <td className={td}>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone[r.status] ?? ""}`}>
                      {t(`status_${r.status}`)}
                    </span>
                  </td>
                  <td className={td}>{r.checkIn ?? "—"}</td>
                  <td className={td}>{r.checkOut ?? "—"}</td>
                  <td className={td}>{hoursWorked(r.checkIn, r.checkOut)}</td>
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
