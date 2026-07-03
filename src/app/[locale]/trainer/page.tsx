import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { TrainerClock } from "./trainer-clock";
import { trainerCheckIn, trainerCheckOut } from "./actions";

export const dynamic = "force-dynamic";

const toMin = (t: string | null) => {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const hoursWorked = (a: string | null, b: string | null) => {
  const x = toMin(a);
  const y = toMin(b);
  if (x == null || y == null || y < x) return "—";
  const m = y - x;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

export default async function TrainerHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth(); // layout enforces auth

  const person = await prisma.person.findUnique({
    where: { userId: session!.user.id },
    include: {
      district: true,
      staffAttendances: { orderBy: { date: "desc" }, take: 60 },
    },
  });
  // Only trainers have this home; anyone else goes to the student portal.
  if (!person || person.kind !== "TRAINER") redirect(`/${locale}/portal`);

  const t = await getTranslations("TrainerHome");

  const todayStr = new Date().toLocaleDateString("en-CA");
  const today = person.staffAttendances.find(
    (r) => r.date.toISOString().slice(0, 10) === todayStr,
  );

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
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
        <h1 className="text-2xl font-bold">
          {t("greeting", { name: person.firstName })}
        </h1>
        <p className="text-sm text-gray-500">
          {person.district ? localized(person.district.name, locale) : ""}
        </p>
      </div>

      <TrainerClock
        locale={locale}
        checkIn={today?.checkIn ?? null}
        checkOut={today?.checkOut ?? null}
        checkedIn={!!today?.checkIn}
        checkedOut={!!today?.checkOut}
        checkInAction={trainerCheckIn}
        checkOutAction={trainerCheckOut}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("myAttendance")}
        </h2>
        {person.staffAttendances.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noAttendance")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
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
                {person.staffAttendances.map((r) => (
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
