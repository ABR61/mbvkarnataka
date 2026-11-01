import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId, withDistrictScope } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { saveStaffAttendance } from "./actions";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "HOLIDAY"] as const;

export default async function StaffAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; saved?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("staff.manage");
  const sp = await searchParams;

  const today = todayISO(); // India date
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? (sp.date as string) : today;
  const date = new Date(`${day}T00:00:00.000Z`);

  const where: Prisma.PersonWhereInput = withDistrictScope(
    { kind: { in: ["STAFF", "TRAINER"] } },
    scopedDistrictId(session),
  );
  const staff = await prisma.person.findMany({
    where,
    include: {
      district: true,
      staffAttendances: { where: { date } },
    },
    orderBy: [{ firstName: "asc" }],
  });

  const t = await getTranslations("Staff");
  const tc = await getTranslations("Common");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const field =
    "rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("attendanceTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("attendanceIntro")}</p>
        </div>
      </div>

      {/* Pick a day (GET) */}
      <form className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("date")}</span>
          <input type="date" name="date" defaultValue={day} className={field} />
        </label>
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {t("show")}
        </button>
      </form>

      {sp.saved && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {t("saved")}
        </p>
      )}

      {staff.length === 0 ? (
        <p className="py-8 text-center text-gray-400">{t("empty")}</p>
      ) : (
        // Mark statuses and save the whole day (POST)
        <form action={saveStaffAttendance} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="date" value={day} />
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th className={th}>{t("name")}</th>
                <th className={th}>{tc("district")}</th>
                <th className={th}>{t("status")}</th>
                <th className={th}>{t("checkIn")}</th>
                <th className={th}>{t("checkOut")}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const rec = s.staffAttendances[0];
                const current = rec?.status ?? "PRESENT";
                return (
                  <tr key={s.id}>
                    <td className={td}>
                      {[s.firstName, s.lastName].filter(Boolean).join(" ")}
                    </td>
                    <td className={td}>
                      {s.district ? localized(s.district.name, locale) : "—"}
                    </td>
                    <td className={td}>
                      <select
                        name={`status_${s.id}`}
                        defaultValue={current}
                        className={field}
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {t(`status_${st}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={td}>
                      <input
                        type="time"
                        name={`in_${s.id}`}
                        defaultValue={rec?.checkIn ?? ""}
                        className={field}
                      />
                    </td>
                    <td className={td}>
                      <input
                        type="time"
                        name={`out_${s.id}`}
                        defaultValue={rec?.checkOut ?? ""}
                        className={field}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t("saveAttendance")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
