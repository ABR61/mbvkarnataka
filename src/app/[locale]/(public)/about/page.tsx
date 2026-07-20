import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

// Static marketing copy — no DB reads, so this can prerender per locale.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  return { title: t("aboutTitle") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  const aboutPoints = [t("aboutPoint1"), t("aboutPoint2"), t("aboutPoint3")];

  const objectives = [
    t("objective1"),
    t("objective2"),
    t("objective3"),
    t("objective4"),
  ];

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
    { title: t("step4Title"), body: t("step4Body") },
  ];

  return (
    <main className="flex flex-1 flex-col">
      {/* About MBV */}
      <section
        id="about"
        className="scroll-mt-20 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/30 dark:to-transparent"
      >
        <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-3xl font-bold">{t("aboutTitle")}</h1>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              {t("aboutBody")}
            </p>
          </div>
          <ul className="space-y-4">
            {aboutPoints.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-200">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Objectives */}
      <section
        id="objectives"
        className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-20"
      >
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold">{t("objectivesTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("objectivesSubtitle")}</p>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {objectives.map((obj, i) => (
            <li
              key={obj}
              className="flex items-start gap-4 rounded-xl border border-gray-200 p-5 transition duration-300 hover:border-emerald-300 hover:shadow-sm dark:border-gray-800"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                {i + 1}
              </span>
              <span className="text-gray-700 dark:text-gray-200">{obj}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="scroll-mt-20 border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
      >
        <div className="mx-auto w-full max-w-5xl px-4 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold">{t("howTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">{t("howSubtitle")}</p>
          </div>
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="rounded-xl border border-gray-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
