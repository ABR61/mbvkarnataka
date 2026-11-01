"use client";

import { useLocale, useTranslations } from "next-intl";

// Branded, bilingual 404 shown when notFound() is thrown in any localized page.
export default function LocaleNotFound() {
  const t = useTranslations("Errors");
  const locale = useLocale();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="text-5xl font-bold text-gray-300 dark:text-gray-700">404</div>
      <h1 className="mt-4 text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-sm text-gray-500">{t("notFoundDescription")}</p>
      <a
        href={`/${locale}`}
        className="mt-8 rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
      >
        {t("home")}
      </a>
    </main>
  );
}
