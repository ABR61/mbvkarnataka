import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

// Lists Karnataka districts from the DB → render per-request.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  return { title: t("branchesTitle") };
}

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  const districtList = await prisma.district.findMany();
  const branches = districtList
    .map((d) => ({ id: d.id, name: localized(d.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-20">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold">{t("branchesTitle")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {t("branchesSubtitle")}
        </p>
      </div>
      {branches.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {branches.map((b) => (
            <li key={b.id}>
              <Link
                href={`/branches/${b.id}`}
                className="block rounded-lg border border-gray-200 bg-white px-4 py-3 text-center text-base font-medium text-gray-800 transition hover:border-emerald-300 hover:text-emerald-700 hover:shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              >
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-gray-500">{t("branchesPlaceholder")}</p>
      )}
    </main>
  );
}
