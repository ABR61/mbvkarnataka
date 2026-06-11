import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

// Reads the DB → render per-request (no DB connection at build time).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) return {};
  return {
    title: localized(program.name, locale),
    description: localized(program.description, locale) || undefined,
  };
}

export default async function PublicProgramDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const program = await prisma.program.findUnique({
    where: { id },
    include: { courses: { orderBy: { sequence: "asc" } } },
  });
  if (!program || program.status !== "active") notFound();

  const t = await getTranslations("Public");
  const description = localized(program.description, locale);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Link href="/programs" className="text-sm text-gray-500 hover:underline">
        ← {t("backToPrograms")}
      </Link>

      <h1 className="mt-4 text-3xl font-bold">{localized(program.name, locale)}</h1>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
        {program.category && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-gray-800">
            {program.category}
          </span>
        )}
        {program.durationWeeks != null && (
          <span>{t("weeks", { count: program.durationWeeks })}</span>
        )}
      </div>

      {description && (
        <p className="mt-6 whitespace-pre-line text-gray-700 dark:text-gray-200">
          {description}
        </p>
      )}

      {program.courses.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t("coursesIncluded")}</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {program.courses.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm dark:border-gray-800"
              >
                {localized(c.name, locale)}
                {c.hours != null && (
                  <span className="ml-2 text-gray-400">
                    · {t("hours", { count: c.hours })}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Link
        href={`/apply?program=${program.id}`}
        className="mt-10 inline-block rounded-md bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
      >
        {t("applyToProgram")}
      </Link>
    </main>
  );
}
