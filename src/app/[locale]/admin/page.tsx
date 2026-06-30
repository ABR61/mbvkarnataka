import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orgSummary } from "@/lib/reports";
import { localized } from "@/lib/localized";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  // Defensive: the layout already gates this, but never deref a null session.
  if (!session?.user) redirect(`/${locale}/sign-in`);
  const t = await getTranslations("Admin");
  const tr = await getTranslations("Reports");
  const user = session.user;

  // Branch admins see only their district's numbers + a banner naming it.
  const districtId = user.districtId;
  const branchDistrict = districtId
    ? await prisma.district.findUnique({ where: { id: districtId } })
    : null;
  const summary = await orgSummary(districtId);

  const kpis = [
    { label: tr("trainees"), value: summary.trainees },
    { label: tr("activeCohorts"), value: summary.activeCohorts },
    { label: tr("certificates"), value: summary.certificates },
    { label: tr("pendingApplications"), value: summary.pendingApplications },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {t("welcome", { name: user.name ?? user.email ?? "" })}
      </h1>
      {branchDistrict && (
        <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          {t("branchOf", { district: localized(branchDistrict.name, locale) })}
        </span>
      )}
      <p className="text-gray-600 dark:text-gray-300">{t("dashboardIntro")}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
          >
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs text-gray-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
        <div className="font-medium">{t("yourRoles")}</div>
        <div className="mt-1 flex flex-wrap gap-2">
          {user.roles.length > 0 ? (
            user.roles.map((r) => (
              <span
                key={r}
                className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 dark:bg-gray-800"
              >
                {r}
              </span>
            ))
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
