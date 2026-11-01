"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Branded, bilingual error boundary for the whole localized app. Catches
// render/runtime errors in pages below [locale] and offers recovery.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");
  const locale = useLocale();

  useEffect(() => {
    // Surface the error for server/console log capture (e.g. Sentry later).
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="text-4xl">⚠️</div>
      <h1 className="mt-4 text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-sm text-gray-500">{t("description")}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          {t("retry")}
        </Button>
        <a
          href={`/${locale}`}
          className="rounded-md border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          {t("home")}
        </a>
      </div>
    </main>
  );
}
