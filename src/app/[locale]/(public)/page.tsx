import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

// Pulls featured programs from the DB → render per-request.
export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  const featured = await prisma.program.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          {t("tagline")}
        </span>
        <h1 className="max-w-2xl text-4xl font-bold sm:text-5xl">{t("title")}</h1>
        <p className="max-w-xl text-lg text-gray-600 dark:text-gray-300">
          {t("subtitle")}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/programs"
            className="rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
          >
            {t("browsePrograms")}
          </Link>
          <Link
            href="/apply"
            className="rounded-md border border-emerald-600 px-5 py-2.5 font-medium text-emerald-700 hover:bg-emerald-50"
          >
            {t("applyNow")}
          </Link>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-4 pb-20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold">{t("featured")}</h2>
            <Link href="/programs" className="text-sm text-emerald-700 hover:underline">
              {t("viewAll")} →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {featured.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
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
    </main>
  );
}
