import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
        {t("tagline")}
      </span>
      <h1 className="text-4xl font-bold sm:text-5xl">{t("title")}</h1>
      <p className="max-w-xl text-lg text-gray-600 dark:text-gray-300">
        {t("subtitle")}
      </p>
      <p className="text-sm text-gray-400">{t("phase")}</p>

      <nav className="mt-4 flex items-center gap-4 text-sm">
        <span className="text-gray-400">{t("language")}:</span>
        <Link href="/" locale="en" className="underline hover:text-emerald-600">
          English
        </Link>
        <Link href="/" locale="kn" className="underline hover:text-emerald-600">
          ಕನ್ನಡ
        </Link>
      </nav>
    </main>
  );
}
