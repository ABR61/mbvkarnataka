import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

// Reads the DB, so render per-request (avoids a DB connection at build time).
// Could become ISR (revalidate) later for SEO/perf.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Public" });
  return { title: t("programsTitle"), description: t("programsIntro") };
}

export default async function PublicProgramsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const programs = await prisma.program.findMany({
    where: { status: "active" },
    include: { _count: { select: { courses: true } } },
    orderBy: { createdAt: "desc" },
  });

  const t = await getTranslations("Public");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-bold">{t("programsTitle")}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">{t("programsIntro")}</p>

      {programs.length === 0 ? (
        <p className="py-16 text-center text-gray-400">{t("programsEmpty")}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {programs.map((p) => {
            const desc = localized(p.description, locale);
            return (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 p-5 dark:border-gray-800"
              >
                <h2 className="text-lg font-semibold">{localized(p.name, locale)}</h2>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  {p.category && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-gray-800">
                      {p.category}
                    </span>
                  )}
                  {p.durationWeeks != null && (
                    <span>{t("weeks", { count: p.durationWeeks })}</span>
                  )}
                  <span>{t("coursesCount", { count: p._count.courses })}</span>
                </div>
                {desc && (
                  <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
                    {desc}
                  </p>
                )}
                <Link
                  href={`/programs/${p.id}`}
                  className="mt-1 text-sm font-medium text-emerald-700 hover:underline"
                >
                  {t("learnMore")} →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
