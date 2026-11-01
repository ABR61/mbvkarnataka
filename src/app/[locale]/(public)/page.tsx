import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { BranchCarousel } from "@/components/public/branch-carousel";
import { formatDate } from "@/lib/dates";

// Pulls live counts + featured programs from the DB → render per-request.
export const dynamic = "force-dynamic";

// The hero promotes one branch card at a time, advancing every hour so each
// branch takes a turn. Server-side and clock-derived, so everyone visiting in
// the same hour sees the same feature (the page is already force-dynamic).
const HOUR_MS = 60 * 60 * 1000;

// Upcoming programmes teased on the home page; the full list lives at
// /future-programs, linked from the section footer.
const HOME_FUTURE_LIMIT = 6;

/** Index of the branch featured in the current hour, cycling through `count`. */
async function featuredIndexForNow(count: number): Promise<number> {
  if (count <= 0) return 0;
  return Math.floor(Date.now() / HOUR_MS) % count;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");
  const tf = await getTranslations("FuturePrograms");

  // Live impact numbers, featured programs, and one activity photo per branch in
  // one round-trip. The photo query is bounded to a row per district, so page
  // cost stays flat however much branches post.
  const [
    trainees,
    programs,
    districts,
    placements,
    featuredPrograms,
    branchPosts,
    futurePrograms,
  ] = await Promise.all([
      prisma.person.count({ where: { kind: "TRAINEE" } }),
      prisma.program.count({ where: { status: "active" } }),
      prisma.district.count(),
      prisma.placement.count(),
      prisma.program.findMany({
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      // One card per branch: `distinct` on districtId with a newest-first order
      // returns each district's most recent photo post.
      prisma.post.findMany({
        where: { imageUrl: { not: null }, approved: true },
        orderBy: { createdAt: "desc" },
        distinct: ["districtId"],
        include: { district: true },
      }),
      // Upcoming programmes from every branch, newest first.
      prisma.futureProgram.findMany({
        where: { approved: true },
        orderBy: { createdAt: "desc" },
        take: HOME_FUTURE_LIMIT,
        include: { district: true },
      }),
    ]);

  // Which branch is in the hero this hour. Ordering is stable (newest-first),
  // so the feature cycles through every branch an hour at a time.
  const featured = branchPosts[await featuredIndexForNow(branchPosts.length)];

  const slides = featured
    ? [
        {
          id: featured.id,
          imageUrl: featured.imageUrl as string,
          title: featured.title,
          body: featured.body,
          district: localized(featured.district.name, locale),
          date: formatDate(featured.createdAt, locale),
        },
      ]
    : [];

  const stats = [
    { value: trainees, label: t("statTrainees") },
    { value: programs, label: t("statPrograms") },
    { value: districts, label: t("statDistricts") },
    { value: placements, label: t("statPlacements") },
  ];

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero: this hour's featured branch, full-bleed under the nav bar. */}
      {slides.length > 0 && <BranchCarousel slides={slides} />}

      {/* Our activities — the gallery behind the hero. */}
      <section
        id="activities"
        className="scroll-mt-20 bg-gray-50 dark:bg-gray-900/40"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="mb-10 text-center">
            {/* Page h1: the hero carries pictures, not the document heading. */}
            <h1 className="text-3xl font-bold">{t("activitiesTitle")}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t("activitiesSubtitle")}
            </p>
          </div>

          {branchPosts.length === 0 ? (
            <p className="py-12 text-center text-gray-400">
              {t("activitiesEmpty")}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {branchPosts.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/branches/${r.districtId}`}
                    className={`group flex h-full flex-col overflow-hidden rounded-xl border bg-white transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md dark:bg-gray-950 ${
                      r.id === featured?.id
                        ? "border-emerald-400 ring-2 ring-emerald-400/40"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.imageUrl as string}
                      alt={r.title}
                      loading="lazy"
                      decoding="async"
                      className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                          {localized(r.district.name, locale)}
                        </span>
                        {r.id === featured?.id && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                            {t("featuredBadge")}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1.5 font-semibold">{r.title}</h3>
                      <p className="mt-1.5 line-clamp-3 flex-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                        {r.body}
                      </p>
                      <time className="mt-4 text-xs text-gray-400">
                        {formatDate(r.createdAt, locale)}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Our future programs — upcoming across every branch */}
      <section id="future-programs" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">{t("futureTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">{t("futureSubtitle")}</p>
          </div>

          {futurePrograms.length === 0 ? (
            <p className="py-12 text-center text-gray-400">{t("futureEmpty")}</p>
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {futurePrograms.map((p) => (
                  <li
                    key={p.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md dark:border-gray-800"
                  >
                    {/* Photos are optional here, so cards without one get a
                        tinted band to keep the grid's rhythm. */}
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-40 w-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-950/20" />
                    )}

                    <div className="flex flex-1 flex-col p-5">
                      <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                        {localized(p.district.name, locale)}
                      </span>
                      <h3 className="mt-1.5 font-semibold">{p.title}</h3>
                      <p className="mt-1.5 line-clamp-3 flex-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                        {p.description}
                      </p>

                      {(p.durationWeeks != null || p.seats != null) && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {p.durationWeeks != null && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {tf("duration")}: {p.durationWeeks}{" "}
                              {tf(p.durationUnit ?? "weeks")}
                            </span>
                          )}
                          {p.seats != null && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {tf("capacity")}: {p.seats}
                            </span>
                          )}
                        </div>
                      )}

                      <Link
                        href={`/apply?future=${p.id}`}
                        className="mt-4 inline-block self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        {tf("applyNow")}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-10 text-center">
                <Link
                  href="/future-programs"
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  {t("viewAll")} →
                </Link>
              </div>
            </>
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
      {featuredPrograms.length > 0 && (
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
            {featuredPrograms.map((p) => (
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
