import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

// Activity reports = posts that carry a photo, shown as a gallery. Per-request.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  return { title: t("reportsTitle") };
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  // Show only the 4 most recent reports per district — older ones stay saved
  // but hidden so the gallery never grows unbounded for any one branch.
  const all = await prisma.post.findMany({
    where: { imageUrl: { not: null }, approved: true },
    include: { district: true },
    orderBy: { createdAt: "desc" },
  });
  const perDistrict = new Map<string, number>();
  const reports = all.filter((r) => {
    const n = perDistrict.get(r.districtId) ?? 0;
    if (n >= 4) return false;
    perDistrict.set(r.districtId, n + 1);
    return true;
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold">{t("reportsTitle")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {t("reportsSubtitle")}
        </p>
      </div>

      {reports.length === 0 ? (
        <p className="py-12 text-center text-gray-400">{t("reportsEmpty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {reports.map((r) => (
            <li
              key={r.id}
              className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.imageUrl as string}
                alt={r.title}
                className="h-32 w-full object-cover"
              />
              <div className="flex flex-1 flex-col p-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                  {localized(r.district.name, locale)}
                </span>
                <h2 className="mt-1.5 text-sm font-semibold">{r.title}</h2>
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
      )}
    </main>
  );
}
