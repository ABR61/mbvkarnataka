import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { BranchCarousel } from "@/components/public/branch-carousel";

// Pulls live counts + featured programs from the DB → render per-request.
export const dynamic = "force-dynamic";

// How many recent photo posts to consider, and how many survive to the grid.
// Bounded so the page cost stays flat as branches keep posting. Per-district
// capping happens in JS, so the pool is deliberately larger than the grid.
const HOME_PHOTO_POOL = 60;
const HOME_PHOTO_GRID = 24;
const PER_DISTRICT_CAP = 4;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  // Live impact numbers, featured programs, and recent activity photos in one
  // round-trip. The photo query is bounded: without a take, an image-heavy site
  // would pull every approved post (and its inline image payload) per request.
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
        where: { imageUrl: { not: null }, approved: true },
        orderBy: { createdAt: "desc" },
        take: HOME_PHOTO_POOL,
        include: { district: true },
      }),
    ]);

  // The 3 newest photos headline the carousel; the gallery below shows the rest,
  // capped at 4 per district so no single branch floods the page.
  const slides = posts.slice(0, 3).map((p) => ({
    id: p.id,
    imageUrl: p.imageUrl as string,
    title: p.title,
    body: p.body,
    district: localized(p.district.name, locale),
    date: p.createdAt.toISOString().slice(0, 10),
  }));
  const headlined = new Set(slides.map((s) => s.id));
  const perDistrict = new Map<string, number>();
  const activities = posts
    .filter((p) => {
      if (headlined.has(p.id)) return false;
      const n = perDistrict.get(p.districtId) ?? 0;
      if (n >= PER_DISTRICT_CAP) return false;
      perDistrict.set(p.districtId, n + 1);
      return true;
    })
    .slice(0, HOME_PHOTO_GRID);

  const stats = [
    { value: trainees, label: t("statTrainees") },
    { value: programs, label: t("statPrograms") },
    { value: districts, label: t("statDistricts") },
    { value: placements, label: t("statPlacements") },
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
      <section className="flex w-full justify-center px-4 py-16">
        <Link
          href="/future-programs"
          className="rounded-md bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700"
        >
          {t("futureCta")}
        </Link>
      </section>

      {/* Our activities — the showcase this page is built around */}
      <section
        id="activities"
        className="scroll-mt-20 border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold">{t("activitiesTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("activitiesSubtitle")}
            </p>
          </div>

          {slides.length > 0 && <BranchCarousel slides={slides} />}

          {slides.length === 0 ? (
            <p className="py-12 text-center text-gray-400">
              {t("activitiesEmpty")}
            </p>
          ) : (
            activities.length > 0 && (
              <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {activities.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.imageUrl as string}
                      alt={r.title}
                      loading="lazy"
                      decoding="async"
                      className="h-32 w-full object-cover"
                    />
                    <div className="flex flex-1 flex-col p-4">
                      <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                        {localized(r.district.name, locale)}
                      </span>
                      <h3 className="mt-1.5 text-sm font-semibold">{r.title}</h3>
                      <p className="mt-1 flex-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                        {r.body}
                      </p>
                      <time className="mt-3 text-xs text-gray-400">
                        {r.createdAt.toISOString().slice(0, 10)}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
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
