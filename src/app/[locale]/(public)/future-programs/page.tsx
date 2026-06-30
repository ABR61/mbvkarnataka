import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

// Upcoming programs + an apply CTA for future activities. Per-request.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  return { title: t("futureTitle") };
}

export default async function FutureProgramsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  // Programs not yet active = upcoming/future.
  const upcoming = await prisma.program.findMany({
    where: { status: { not: "active" } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold">{t("futureTitle")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {t("futureSubtitle")}
        </p>
      </div>

      {upcoming.length > 0 ? (
        <ul className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {upcoming.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
            >
              <h2 className="font-semibold">{localized(p.name, locale)}</h2>
              {p.category && (
                <p className="mt-1 text-xs text-gray-500">{p.category}</p>
              )}
              {p.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {localized(p.description, locale)}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-10 text-center text-gray-500">{t("futureEmpty")}</p>
      )}

      {/* Apply now for future activities */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
        <p className="max-w-xl text-gray-700 dark:text-gray-200">
          {t("futureNote")}
        </p>
        <Link
          href="/apply"
          className="rounded-md bg-emerald-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700"
        >
          {t("futureApply")}
        </Link>
      </div>
    </main>
  );
}
