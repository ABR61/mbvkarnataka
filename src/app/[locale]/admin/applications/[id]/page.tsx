import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { Link } from "@/i18n/navigation";
import { cohortOptions } from "@/lib/options";
import { StatusForm, ConvertForm } from "../application-forms";
import { updateApplication, convertApplication } from "../actions";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("application.manage");

  const app = await prisma.application.findUnique({
    where: { id },
    include: { program: true, district: true },
  });
  if (!app) notFound();

  const t = await getTranslations("Applications");
  const tp = await getTranslations("People");
  const tc = await getTranslations("Common");
  const cohorts = app.personId ? [] : await cohortOptions(locale);

  const row = (label: string, value: string) => (
    <div className="flex gap-2 border-t border-gray-100 py-1.5 text-sm dark:border-gray-800">
      <span className="w-40 shrink-0 text-gray-500">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href="/admin/applications" className="text-sm text-gray-500 hover:underline">
          ← {t("title")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {[app.firstName, app.lastName].filter(Boolean).join(" ")}
        </h1>
        <p className="text-sm text-gray-500">{t(`status_${app.status}`)}</p>
      </div>

      <section>
        {row(tp("firstName"), app.firstName)}
        {row(tp("lastName"), app.lastName ?? "")}
        {row(tc("phone"), app.phone)}
        {row(tp("email"), app.email ?? "")}
        {row(tp("gender"), app.gender ? tp(`gender_${app.gender}`) : "")}
        {row(
          tp("dateOfBirth"),
          app.dateOfBirth ? app.dateOfBirth.toISOString().slice(0, 10) : "",
        )}
        {row(tc("district"), app.district ? localized(app.district.name, locale) : "")}
        {row(t("program"), app.program ? localized(app.program.name, locale) : "")}
        {row(t("message"), app.message ?? "")}
        {row(t("consentGiven"), app.consentAt ? app.consentAt.toISOString().slice(0, 10) : "—")}
      </section>

      {app.personId ? (
        <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          {t("convertedTo")}{" "}
          <Link
            href={`/admin/trainees/${app.personId}/edit`}
            className="font-medium text-emerald-700 hover:underline"
          >
            {t("viewTrainee")}
          </Link>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t("review")}</h2>
            <StatusForm
              locale={locale}
              id={app.id}
              status={app.status}
              reviewNote={app.reviewNote ?? ""}
              action={updateApplication}
            />
          </section>

          <section className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
            <h2 className="text-lg font-semibold">{t("convertTitle")}</h2>
            <p className="text-sm text-gray-500">{t("convertHint")}</p>
            <ConvertForm
              locale={locale}
              id={app.id}
              cohorts={cohorts}
              action={convertApplication}
            />
          </section>
        </>
      )}
    </div>
  );
}
