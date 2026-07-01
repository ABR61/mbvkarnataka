import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

// Pulls live counts + featured programs from the DB → render per-request.
export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  // Live impact numbers, featured programs, and latest branch posts in one round-trip.
  const [trainees, programs, districts, placements, featured, posts] =
    await Promise.all([
      prisma.person.count({ where: { kind: "TRAINEE" } }),
      prisma.program.count({ where: { status: "active" } }),
      prisma.district.count(),
      prisma.placement.count(),
      prisma.program.findMany({
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.post.findMany({
        where: { approved: true },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { district: true },
      }),
    ]);

  const stats = [
    { value: trainees, label: t("statTrainees") },
    { value: programs, label: t("statPrograms") },
    { value: districts, label: t("statDistricts") },
    { value: placements, label: t("statPlacements") },
  ];

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
    { title: t("step4Title"), body: t("step4Body") },
  ];

  const aboutPoints = [t("aboutPoint1"), t("aboutPoint2"), t("aboutPoint3")];

  const objectives = [
    t("objective1"),
    t("objective2"),
    t("objective3"),
    t("objective4"),
  ];


  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section
        id="top"
        className="relative overflow-hidden bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/30 dark:to-transparent"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 px-4 pb-10 pt-20 text-center">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            {t("tagline")}
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-xl text-lg text-gray-600 dark:text-gray-300">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Future programs CTA */}
      <section className="flex w-full justify-center px-4 pb-16 pt-10">
        <Link
          href="/future-programs"
          className="rounded-md bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700"
        >
          {t("futureCta")}
        </Link>
      </section>

      {/* Latest posts from branches */}
      {posts.length > 0 && (
        <section
          id="news"
          className="scroll-mt-20 border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
        >
          <div className="mx-auto w-full max-w-5xl px-4 py-20">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold">{t("newsTitle")}</h2>
              <p className="mt-1 text-sm text-gray-500">{t("newsSubtitle")}</p>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950"
                >
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                    {localized(p.district.name, locale)}
                  </span>
                  <h3 className="mt-2 font-semibold">{p.title}</h3>
                  <p className="mt-1 flex-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                    {p.body}
                  </p>
                  <time className="mt-3 text-xs text-gray-400">
                    {p.createdAt.toISOString().slice(0, 10)}
                  </time>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* About MBV */}
      <section
        id="about"
        className="scroll-mt-20 border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
      >
        <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-bold">{t("aboutTitle")}</h2>
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
      <section id="objectives" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-20">
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

      {/* Impact stats */}
      <section className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-14">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold">{t("statsTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">{t("statsSubtitle")}</p>
          </div>
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="text-4xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {s.value.toLocaleString(locale)}
                </dt>
                <dd className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold">{t("howTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("howSubtitle")}</p>
        </div>
        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-xl border border-gray-200 p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md dark:border-gray-800"
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
      </section>

      {/* Featured programs */}
      {featured.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-4 py-20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("featured")}</h2>
            <Link
              href="/programs"
              className="text-sm text-emerald-700 hover:underline"
            >
              {t("viewAll")} →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {featured.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-gray-200 p-5 transition hover:border-emerald-300 hover:shadow-sm dark:border-gray-800"
              >
                <h3 className="font-semibold">{localized(p.name, locale)}</h3>
                {p.category && (
                  <p className="mt-1 text-xs text-gray-500">{p.category}</p>
                )}
                <Link
                  href={`/programs/${p.id}`}
                  className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline"
                >
                  {t("learnMore")} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Apply CTA band */}
      <section className="bg-emerald-600 dark:bg-emerald-700">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center">
          <h2 className="max-w-2xl text-3xl font-bold text-white">
            {t("ctaTitle")}
          </h2>
          <p className="max-w-xl text-emerald-50">{t("ctaSubtitle")}</p>
        </div>
      </section>
    </main>
  );
}
