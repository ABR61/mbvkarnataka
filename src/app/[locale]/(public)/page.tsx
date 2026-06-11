import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
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
    </main>
  );
}
