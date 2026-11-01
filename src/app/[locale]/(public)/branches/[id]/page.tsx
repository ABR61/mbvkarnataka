import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { formatDate } from "@/lib/dates";

// Per-district branch page → render per-request.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const district = await prisma.district.findUnique({ where: { id } });
  if (!district) return {};
  return { title: localized(district.name, locale) };
}

export default async function DistrictBranchPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  const district = await prisma.district.findUnique({
    where: { id },
    include: {
      centers: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } },
      // Approved posts/activity for this district — visible to everyone.
      posts: { where: { approved: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!district) notFound();

  const name = localized(district.name, locale);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
      <Link href="/branches" className="text-sm text-emerald-700 hover:underline">
        {t("branchesBack")}
      </Link>

      <h1 className="mt-4 text-3xl font-bold">{name}</h1>
      <p className="mt-1 text-gray-500">{district.state}</p>

      <h2 className="mt-12 text-xl font-bold">{t("branchCentersTitle")}</h2>
      {district.centers.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {district.centers.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
            >
              <h3 className="font-semibold">{localized(c.name, locale)}</h3>
              {c.address && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {c.address}
                </p>
              )}
              {c.contactPhone && (
                <a
                  href={`tel:${c.contactPhone.replace(/\s+/g, "")}`}
                  className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline"
                >
                  {c.contactPhone}
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-gray-500">{t("branchNoCenters")}</p>
      )}

      {/* Updates & activities posted for this district — public */}
      <h2 className="mt-12 text-xl font-bold">{t("branchUpdatesTitle")}</h2>
      {district.posts.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {district.posts.map((p) => (
            <li
              key={p.id}
              className="flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
            >
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-40 w-full object-cover" />
              )}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1 flex-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                  {p.body}
                </p>
                <time className="mt-3 text-xs text-gray-400">
                  {formatDate(p.createdAt, locale)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-gray-500">{t("branchNoUpdates")}</p>
      )}
    </main>
  );
}
