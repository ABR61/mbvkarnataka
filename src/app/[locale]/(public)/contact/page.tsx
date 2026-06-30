import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  return { title: t("contactTitle") };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  const contact = [
    {
      label: t("contactEmailLabel"),
      value: t("contactEmail"),
      href: `mailto:${t("contactEmail")}`,
    },
    {
      label: t("contactPhoneLabel"),
      value: t("contactPhone"),
      href: `tel:${t("contactPhone").replace(/\s+/g, "")}`,
    },
    {
      label: t("contactAddressLabel"),
      value: t("contactAddress"),
      href: null,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-20">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold">{t("contactTitle")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {t("contactSubtitle")}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {contact.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-200 p-6 text-center dark:border-gray-800"
          >
            <dt className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              {c.label}
            </dt>
            <dd className="mt-2 font-medium">
              {c.href ? (
                <a href={c.href} className="text-emerald-700 hover:underline">
                  {c.value}
                </a>
              ) : (
                <span className="text-gray-700 dark:text-gray-200">{c.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
