import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { districtReport, orgSummary } from "@/lib/reports";

export const dynamic = "force-dynamic";

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("report.view");

  const [summary, districts] = await Promise.all([orgSummary(), districtReport()]);
  const t = await getTranslations("Reports");

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const thNum = "px-3 py-2 text-right font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";
  const tdNum = `${td} text-right tabular-nums`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
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
