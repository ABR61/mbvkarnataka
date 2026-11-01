import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { formatINR } from "@/lib/money";
import {
  districtReport,
  orgSummary,
  placementSummary,
  followUpProgression,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

const pct = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("report.view");

  const [summary, districts, placements, progression] = await Promise.all([
    orgSummary(),
    districtReport(),
    placementSummary(),
    followUpProgression(),
  ]);
  const t = await getTranslations("Reports");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const thNum = "px-3 py-2 text-right font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const tdNum = `${td} text-right tabular-nums`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
        </div>
        <a
          href={`/${locale}/admin/reports/export`}
          download
          className="shrink-0 rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          {t("exportCsv")}
        </a>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("summary")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label={t("trainees")} value={summary.trainees} />
          <Kpi label={t("activeCohorts")} value={summary.activeCohorts} />
          <Kpi label={t("certificates")} value={summary.certificates} />
          <Kpi label={t("pendingApplications")} value={summary.pendingApplications} />
          <Kpi label={t("districts")} value={summary.districts} />
          <Kpi label={t("centers")} value={summary.centers} />
          <Kpi label={t("programs")} value={summary.programs} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("placementOutcomes")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label={t("placed")} value={placements.total} />
          <Kpi label={t("placementRate")} value={pct(placements.placementRate)} />
          <Kpi
            label={t("avgSalary")}
            value={placements.avgMonthlySalary != null ? formatINR(placements.avgMonthlySalary) : "—"}
          />
          <Kpi label={t("retention")} value={pct(placements.retention)} />
          <Kpi label={t("status_PLACED")} value={placements.byStatus.PLACED} />
          <Kpi label={t("status_ACTIVE")} value={placements.byStatus.ACTIVE} />
          <Kpi label={t("status_EXITED")} value={placements.byStatus.EXITED} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("outcomesOverTime")}
        </h2>
        {progression.periods.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noFollowUps")}</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Kpi
                label={t("baselineSalary")}
                value={
                  progression.baselineAvgSalary != null
                    ? formatINR(progression.baselineAvgSalary)
                    : "—"
                }
              />
              <Kpi
                label={t("latestIncome")}
                value={
                  progression.latestAvgIncome != null
                    ? formatINR(progression.latestAvgIncome)
                    : "—"
                }
              />
              <Kpi
                label={t("incomeUplift")}
                value={
                  progression.baselineAvgSalary && progression.latestAvgIncome
                    ? `${
                        progression.latestAvgIncome >= progression.baselineAvgSalary
                          ? "+"
                          : ""
                      }${Math.round(
                        ((progression.latestAvgIncome - progression.baselineAvgSalary) /
                          progression.baselineAvgSalary) *
                          100,
                      )}%`
                    : "—"
                }
              />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>{t("checkpoint")}</th>
                  <th className={thNum}>{t("followedUp")}</th>
                  <th className={thNum}>{t("stillEmployed")}</th>
                  <th className={thNum}>{t("retention")}</th>
                  <th className={thNum}>{t("avgIncome")}</th>
                </tr>
              </thead>
              <tbody>
                {progression.periods.map((p) => (
                  <tr key={p.periodMonths}>
                    <td className={td}>{t("months", { count: p.periodMonths })}</td>
                    <td className={tdNum}>{p.followed}</td>
                    <td className={tdNum}>{p.stillEmployed}</td>
                    <td className={tdNum}>{pct(p.retention)}</td>
                    <td className={tdNum}>
                      {p.avgIncome != null ? formatINR(p.avgIncome) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("byDistrict")}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("district")}</th>
              <th className={thNum}>{t("centers")}</th>
              <th className={thNum}>{t("cohorts")}</th>
              <th className={thNum}>{t("enrolled")}</th>
              <th className={thNum}>{t("completed")}</th>
              <th className={thNum}>{t("certificates")}</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d.id}>
                <td className={td}>{localized(d.name, locale)}</td>
                <td className={tdNum}>{d.centers}</td>
                <td className={tdNum}>{d.cohorts}</td>
                <td className={tdNum}>{d.enrolled}</td>
                <td className={tdNum}>{d.completed}</td>
                <td className={tdNum}>{d.certificates}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
